using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Middleware;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CSE.DatabricksSCIMAutomation
{
    /// <summary>
    /// WebHostBuilder Startup
    /// </summary>
    public class Startup
    {
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="configuration">the configuration for WebHost</param>
        public Startup(IConfiguration configuration)
        {
            // keep a local reference
            Configuration = configuration;
        }

        /// <summary>
        /// Service configuration
        /// </summary>
        /// <param name="services">The services in the web host</param>
        public static void ConfigureServices(IServiceCollection services)
        {
            // set json serialization defaults
            services.AddControllers().AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.IgnoreNullValues = true;
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
        }

        /// <summary>
        /// Configure the application builder
        /// </summary>
        /// <param name="app"></param>
        /// <param name="env"></param>
        public static void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            // log http responses to the console
            // this should be first as it "wraps" all requests
            if (App.AppLogLevel != LogLevel.None)
            {
                app.UseLogger(new LoggerOptions
                {
                    Log2xx = App.AppLogLevel <= LogLevel.Information,
                    Log3xx = App.AppLogLevel <= LogLevel.Information,
                    Log4xx = App.AppLogLevel <= LogLevel.Warning,
                    Log5xx = true
                });
            }
            // differences based on dev or prod
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            // use routing
            app.UseRouting();

            // map the controllers
            app.UseEndpoints(ep => { ep.MapControllers(); });

            // use the robots middleware to handle /robots*.txt requests
            app.UseRobots();

            // use the version middleware to handle /version
            app.UseVersion();
        }
    }
}