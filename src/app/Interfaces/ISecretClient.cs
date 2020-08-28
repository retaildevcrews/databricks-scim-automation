using Azure.Security.KeyVault.Secrets;
using System;
using System.Security;

namespace CSE.DatabricksSCIMAutomation.Interfaces
{
    public interface ISecretClient
    {
        public Uri Uri { get; set; }
        public KeyVaultSecret GetSecret(string secretName);
        public SecureString GetSecretValue(string secretName);
    }
}
