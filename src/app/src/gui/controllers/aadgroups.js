const url = require('url');
const graph = require('@databricks-scim-automation/graph');

/**
 * Sends details about the AAD group.
 * Contains name and object ID of AAD group. Object ID used in subsequent calls, body.value[{ id }]
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function getAadGroups(req, res) {
    try {
        const { query: { filterAadGroupDisplayName } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-graph-access-token'];
        const response = await graph.getAadGroups({ graphAccessToken, filterAadGroupDisplayName });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching aad groups';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    };
}

module.exports = { getAadGroups };