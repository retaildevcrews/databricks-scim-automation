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
            secretClient = new SecretClient(Uri, credService.CurrentCredential);
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
    }
}