using Azure.Core;
using System;
using System.Collections.Generic;
using System.Text;

namespace CSE.DatabricksSCIMAutomation.Interfaces
{
        public interface ICredentialService
        {
            public TokenCredential CurrentCredential { get; }
        }
}
