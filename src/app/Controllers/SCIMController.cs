using Microsoft.Azure.KeyVault;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using KeyVault.Extensions;

namespace CSE.DatabricksSCIMAutomation.Controllers
{
    /// <summary>
    /// Handle the single /api/genres requests
    /// </summary>
    [Route("api/[controller]")]
    public class SCIMController : Controller
    {
        private readonly ILogger logger;
        // private readonly IDAL dal;
        private readonly IKeyVaultConnection keyVaultConnection;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">log instance</param>
        /// <param name="dal">data access layer instance</param>
        public SCIMController(ILogger<SCIMController> logger, /*IDAL dal,*/ IKeyVaultConnection keyVaultConnection)
        {
            this.logger = logger;
            // this.dal = dal;
            this.keyVaultConnection = keyVaultConnection;
        }

        /// <summary>
        /// Returns JSON
        /// </summary>
        /// <response code="200">JSON</response>
        [HttpGet]
        public async Task<IActionResult> CreateSCIM()
        {
            // validate parameters
            // make calls to Graph
            // return 

            // TODO: Remove dummy behavior - currently looks for "Access token" secret and returns the value
            var secret = await keyVaultConnection.Client.GetSecretAsync(keyVaultConnection.Uri.AbsoluteUri, Constants.AccessToken).ConfigureAwait(false);
            return Ok(secret.Value);
            // return await ResultHandler.Handle(dal.GetGenresAsync(), nameof(GetGenresAsync), Constants.GenresControllerException, logger).ConfigureAwait(false);
        }
    }
}
