const url = require('url');
const graph = require('@databricks-scim-automation/graph');

/**
 * Sends url for Microsoft login portal
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
function getRedirectLogin(req, res) {
    const { headers: { origin, host } } = req;
    const { query: { tenantId, clientId } } = url.parse(req.url, true);
    const redirectUrl = graph.getRedirectLoginUrl({ origin, host, tenantId, clientId });
    res.send(redirectUrl);
}

/**
 * Sends an access token
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postAccessToken(req, res) {
    try {
        const { query: { code, tenantId, clientId } } = url.parse(req.url, true);
        const { headers: { origin, host, ['x-client-secret']: clientSecret } } = req;
        const response = await graph.postAccessToken({ code, origin, host, tenantId, clientId, clientSecret });

        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(JSON.stringify(body));
    } catch(err) {
        const errorMessage = 'Error fetching token';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Sends a refreshed the access token
 * @param {Object} req Express request 
 * @param {Object} res Express response
 * @return {void}
 */
async function postRefreshAccessToken(req, res) {
    try {
        const { headers: {
            ['x-refresh-token']: refreshToken,
            ['x-client-secret']: clientSecret,
            origin,
            host,
        } } = req;
        const { query: { tenantId, clientId } } = url.parse(req.url, true);
        const response = await graph.postRefreshAccessToken({ refreshToken, origin, host, tenantId, clientId, clientSecret });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(JSON.stringify(body));
    } catch(err) {
        const errorMessage = 'Error refreshing token';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}


module.exports = {
    getRedirectLogin,
    postAccessToken,
    postRefreshAccessToken,
};