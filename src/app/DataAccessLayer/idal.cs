using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CSE.DatabricksSCIMAutomation.DataAccessLayer
{
    /// <summary>
    /// Data Access Layer for CosmosDB Interface
    /// </summary>
    public interface IDAL
    {
        Task Reconnect(Uri cosmosUrl, string cosmosKey, string cosmosDatabase, string cosmosCollection, bool force = false);
    }
}