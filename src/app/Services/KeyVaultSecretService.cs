using Azure.Core;
using Azure.Security.KeyVault.Secrets;
using CSE.DatabricksSCIMAutomation.Interfaces;
using CSE.DatabricksSCIMAutomation.Utilities;
using System;
using System.Security;

namespace CSE.DatabricksSCIMAutomation.Services
{
    public class KeyVaultSecretService : ISecretClient
    {
        private readonly SecretClient secretClient = default;

        public KeyVaultSecretService(string keyVaultName, ICredentialService credService)
        {
            if (credService == null)
            {
                credService = new CredentialService(AuthenticationType.MI);
            }
            //build URI
            if (!KeyVaultHelper.BuildKeyVaultConnectionString(keyVaultName, out string keyVaultUri))
            {
#pragma warning disable CA1303 // Do not pass literals as localized parameters
                throw new Exception("Key vault name not Valid"); //TODO: place holder code ensure error message is good and contains input value
#pragma warning restore CA1303 // Do not pass literals as localized parameters
            }

            Uri = new Uri(keyVaultUri);
            //construct secret client
            secretClient = GetKeyVaultSecretClient(keyVaultUri, credService.CurrentCredential);
        }

        public Uri Uri { get; set; }

        public KeyVaultSecret GetSecret(string secretName)
        {
            return secretClient.GetSecret(secretName);
        }

        public SecureString GetSecretValue(string secretName)
        {
            return SecureStringHelper.ConvertToSecureString(GetSecret(secretName).Value);
        }

        /// <summary>
        /// Get a valid key vault secret client
        /// </summary>
        /// <param name="kvUrl">URL of the key vault</param>
        /// <param name="authType">MI, CLI or VS</param>
        /// <returns></returns>
        static SecretClient GetKeyVaultSecretClient(string kvUrl, TokenCredential cred)
        {
            try
            {
                // use Managed Identity (MI) for secure access to Key Vault
                var secretClient = new SecretClient(new Uri(kvUrl), cred);

                // read a key to make sure the connection is valid 
                // TODO: Update with secret we know will be there for graph API calls
                // Currently just using "AccessToken" until we learn more
                secretClient.GetSecret(Constants.AccessToken);

                // return the client
                return secretClient;
            }
            catch (Exception ex)
            {
                // log and fail
                Console.WriteLine($"{ex}\nKeyVault:Exception: {ex.Message}");
                return null;
            }
        }
    }
}