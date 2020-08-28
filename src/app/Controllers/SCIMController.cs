using CSE.DatabricksSCIMAutomation.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace CSE.DatabricksSCIMAutomation.Controllers
{
    /// <summary>
    /// Handle the single /api/genres requests
    /// </summary>
    [Route("api/[controller]")]
    public class SCIMController : Controller
    {
#pragma warning disable IDE0052 // Remove unread private members
        private readonly ILogger logger;
#pragma warning restore IDE0052 // Remove unread private members
                               // private readonly IDAL dal;
        private readonly ISecretClient keyVaultClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">log instance</param>
        /// <param name="dal">data access layer instance</param>
        public SCIMController(ILogger<SCIMController> logger, /*IDAL dal,*/ ISecretClient keyVaultClient)
        {
            this.logger = logger;
            // this.dal = dal;
            this.keyVaultClient = keyVaultClient;
        }

        /// <summary>
        /// Returns JSON
        /// </summary>
        /// <response code="200">JSON</response>
        [HttpGet]
        public IActionResult CreateSCIM()
        {
            // validate parameters
            // make calls to Graph
            // return 

            // TODO: Remove dummy behavior - currently looks for "Access token" secret and returns the value
            var secret = keyVaultClient.GetSecretValue(Constants.AccessToken);// await keyVaultConnection.Client.GetSecretAsync(keyVaultConnection.Uri.AbsoluteUri, Constants.AccessToken).ConfigureAwait(false);
            return Ok(secret);
            // return await ResultHandler.Handle(dal.GetGenresAsync(), nameof(GetGenresAsync), Constants.GenresControllerException, logger).ConfigureAwait(false);
        }
    }
}
