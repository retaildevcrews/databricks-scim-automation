using CSE.DatabricksSCIMAutomation.DataAccessLayer;
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
        private readonly ILogger logger;
        private readonly IDAL dal;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">log instance</param>
        /// <param name="dal">data access layer instance</param>
        public SCIMController(ILogger<SCIMController> logger, IDAL dal)
        {
            this.logger = logger;
            this.dal = dal;
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
            return Ok("placeholder");
            // return await ResultHandler.Handle(dal.GetGenresAsync(), nameof(GetGenresAsync), Constants.GenresControllerException, logger).ConfigureAwait(false);
        }
    }
}
