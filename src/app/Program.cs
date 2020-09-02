using Azure.Security.KeyVault.Secrets;
using CSE.DatabricksSCIMAutomation.Services;
using CSE.DatabricksSCIMAutomation.Interfaces;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MIC = Microsoft.Identity.Client;
// using Microsoft.Identity.Json.Linq;
using System;
using System.CommandLine;
using System.CommandLine.Invocation;
using System.CommandLine.Parsing;
using System.IO;
using System.Security;
using System.Threading;
using System.Threading.Tasks;
using CSE.DatabricksSCIMAutomation.Utilities;

namespace CSE.DatabricksSCIMAutomation
{
    public sealed partial class App
    {
        // ILogger instance
        private static ILogger<App> logger;

        // web host
        private static IWebHost host;

        // Key Vault configuration
        private static IConfigurationRoot config = null;
        private static ISecretClient kvSecretService;

        private static CancellationTokenSource ctCancel;

        public static LogLevel AppLogLevel { get; set; } = LogLevel.Warning;

        /// <summary>
        /// Main entry point
        /// 
        /// Configure and run the web server
        /// </summary>
        /// <param name="args">command line args</param>
        public static async Task<int> Main(string[] args)
        {
            // build the System.CommandLine.RootCommand
            RootCommand root = BuildRootCommand();
            root.Handler = CommandHandler.Create<string, AuthenticationType, LogLevel, bool>(RunApp);

            // run the app
            return await root.InvokeAsync(CombineEnvVarsWithCommandLine(args)).ConfigureAwait(false);
        }

        /// <summary>
        /// Stop the web server via code
        /// </summary>
        public static void Stop()
        {
            if (ctCancel != null)
            {
                ctCancel.Cancel(false);
            }
        }

        /// <summary>
        /// Creates a CancellationTokenSource that cancels on ctl-c pressed
        /// </summary>
        /// <returns>CancellationTokenSource</returns>
        private static CancellationTokenSource SetupCtlCHandler()
        {
            CancellationTokenSource ctCancel = new CancellationTokenSource();

            Console.CancelKeyPress += async delegate (object sender, ConsoleCancelEventArgs e)
            {
                e.Cancel = true;
                ctCancel.Cancel();

                Console.WriteLine("Ctl-C Pressed - Starting shutdown ...");

                // trigger graceful shutdown for the webhost
                // force shutdown after timeout, defined in UseShutdownTimeout within BuildHost() method
                await host.StopAsync().ConfigureAwait(false);

                // end the app
                Environment.Exit(0);
            };

            return ctCancel;
        }

        /// <summary>
        /// Log startup messages
        /// </summary>
        private static void LogStartup()
        {
            // get the logger service
            logger = host.Services.GetRequiredService<ILogger<App>>();

            if (logger != null)
            {
                if (kvSecretService != null)
                {
                    try
                    {
                        kvSecretService.GetSecretValue(Constants.AppInsightsKey);
                    }
                    catch (Exception)
                    {
                        // log a not using app insights warning
                        logger.LogWarning("App Insights Key not set");
                    }
                }

                logger.LogInformation("Web Server Started");
            }

            Console.WriteLine($"Version: {Middleware.VersionExtensions.Version}");
        }

        /// <summary>
        /// Builds the config for the web server
        /// </summary>
        /// <returns>Root Configuration</returns>
        static IConfigurationRoot BuildConfig()
        {
            try
            {
                // standard config builder
                var cfgBuilder = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false);

                // build the config
                return cfgBuilder.Build();
            }
            catch (Exception ex)
            {
                // log and fail

                Console.WriteLine($"{ex}\nBuildConfig:Exception: {ex.Message}");
                Environment.Exit(-1);
            }

            return null;
        }

        static async Task<string> GetATokenForGraph(string kvName, AuthenticationType authType)
        {
            ICredentialService credService = new CredentialService(authType);
            kvSecretService = new KeyVaultSecretService(kvName, credService);
            string loginUsername = kvSecretService.GetSecret(Constants.LoginUsername).Value;
            SecureString loginPasswordSecret = kvSecretService.GetSecretValue(Constants.LoginPassword);

            string tenantId = Environment.GetEnvironmentVariable("TENANT_ID");
            Uri authority = new Uri($"https://login.microsoftonline.com/{tenantId}");
            string[] scopes = new string[] { "user.read" };

            string clientId = Environment.GetEnvironmentVariable("CLIENT_ID"); // DAEMON APPLICATION
            MIC.IPublicClientApplication app;
            app = MIC.PublicClientApplicationBuilder
                .Create(clientId)
                .WithAuthority(authority)
                .Build();

            var accounts = await app.GetAccountsAsync().ConfigureAwait(false);
            // var accounts = await app.GetAccountsAsync();
            MIC.AuthenticationResult result = null;
            if (accounts.GetEnumerator().Current != null)
            // if (accounts.Any())
            {
                result = await app.AcquireTokenSilent(scopes, accounts.GetEnumerator().Current)
                // result = await app.AcquireTokenSilent(scopes, accounts.FirstOrDefault())
                    .ExecuteAsync()
                    .ConfigureAwait(false);
            }
            else
            {
                try
                {
                    result = await app.AcquireTokenByUsernamePassword(scopes, loginUsername, loginPasswordSecret)
                        .ExecuteAsync()
                        .ConfigureAwait(false);
                }
                catch(MIC.MsalException e)
                {
                    Console.WriteLine(e);
                }
            }
            return result.AccessToken;
        }

        /// <summary>
        /// Build the web host
        /// </summary>
        /// <param name="kvUrl">URL of the Key Vault</param>
        /// <param name="authType">MI, CLI, VS</param>
        /// <returns>Web Host ready to run</returns>
        // static IWebHost BuildHost(string kvName, AuthenticationType authType)
        static async Task<IWebHost> BuildHost(string kvName, AuthenticationType authType)
        {
            // build the config
            config = BuildConfig();

            ICredentialService credService = new CredentialService(authType);

            try
            {
                string accessToken = await GetATokenForGraph(kvName, authType).ConfigureAwait(false);
                Console.WriteLine(accessToken);
                kvSecretService = new KeyVaultSecretService(kvName, credService);
                kvSecretService.GetSecret(Constants.AccessToken);
            }
            catch (Exception ex)
            {
                // log and fail
                Console.WriteLine($"{ex}\nKeyVault:Exception: {ex.Message}");
                return null;
            }

            // configure the web host builder
            IWebHostBuilder builder = WebHost.CreateDefaultBuilder()
                .UseConfiguration(config)
                .UseKestrel()
                .UseUrls(string.Format(System.Globalization.CultureInfo.InvariantCulture, $"http://*:{Constants.Port}/"))
                .UseStartup<Startup>()
                .UseShutdownTimeout(TimeSpan.FromSeconds(Constants.GracefulShutdownTimeout))
                .ConfigureServices(services =>
                {
                    services.AddSingleton<ISecretClient>(kvSecretService);
                    try{
                        services.AddApplicationInsightsTelemetry(SecureStringHelper.ConvertToUnsecureString(kvSecretService.GetSecretValue(Constants.AppInsightsKey)));
                    }
                    catch (Exception)
                    {
                        // TODO: log warning? would be dupe
                        // Maybe create helper extension to clean up this function
                    }
                    
                })
                // configure logger based on command line
                .ConfigureLogging(logger =>
                {
                    logger.ClearProviders();
                    logger.AddConsole()
                    .AddFilter("Microsoft", AppLogLevel)
                    .AddFilter("System", AppLogLevel)
                    .AddFilter("Default", AppLogLevel);
                });

            // build the host
            return builder.Build();
        }

    }
}
