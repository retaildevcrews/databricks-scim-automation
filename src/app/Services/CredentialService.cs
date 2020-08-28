using System;
using System.Collections.Generic;
using System.Text;
using System.Transactions;
using Azure.Core;
using CSE.DatabricksSCIMAutomation.Interfaces;
using Azure.Identity;

namespace CSE.DatabricksSCIMAutomation.Services
{
    class CredentialService : ICredentialService
    {
        readonly TokenCredential currentCredential = default;

        public CredentialService(AuthenticationType credType)
        {
            currentCredential = GetTokenCredential(credType);
        }

        private static TokenCredential GetTokenCredential(AuthenticationType credType)
        {
            try
            {
                // use MI as default
                TokenCredential cred = new ManagedIdentityCredential();
#if (DEBUG)
                // Only support CLI and VS credentials in debug mode
                switch (credType)
                {
                    case AuthenticationType.CLI:
                        cred = new AzureCliCredential();
                        break;
                    case AuthenticationType.VS:
                        cred = new VisualStudioCredential();
                        break;
                }
#else
                if (credType != AuthenticationType.MI)
                {
                    //Console.WriteLine("Release builds require MI authentication for Key Vault");
                    return null;
                }
#endif
                return cred;
            }
            catch (Exception ex)
            {
                // log and fail
                Console.WriteLine($"{ex}\nTokenCredential:Exception: {ex.Message}");
                return null;
            }
        }

        public TokenCredential CurrentCredential
        {
            get { return currentCredential; }
        }

    }
}
