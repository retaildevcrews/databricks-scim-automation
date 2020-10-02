const fs = require('fs');
const path = require('path');
const url = require('url');
const graph = require('@databricks-scim-automation/graph');
const keyvaultService = require('../services/keyvault');
const { keyvaultSettings, tokenSettings } = require('../../config');

/**
 * Sends html/JS for Database SCIM Automation GUI
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
function getHomepage(req, res) {
    const htmlPath = path.resolve(__dirname, './homepage.html');
    try {
        const response = fs.readFileSync(htmlPath);
        res.set('Content-Type', 'text/html').send(response);
    } catch (err) {
        const errorMessage = 'Error reading and sending homepage html';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.status(500).set('Content-Type', 'text/plain').send(errorMessage);
    }
}

async function getKeyvaultSecrets(req, res) {
    try {
        const { query } = url.parse(req.url, true);
        const keyvaultUrl = query.url === '.env' ? process.env.KEYVAULT_URL : query.url;
        const keys = [
            keyvaultSettings.TENANT_ID_KEY,
            keyvaultSettings.CLIENT_ID_KEY,
            keyvaultSettings.CLIENT_SECRET_KEY,
        ];
        const secrets = await keyvaultService.getKeyvaultSecrets(keyvaultUrl, keys);
        res.set('Content-Type', 'application/json').status(200).send(JSON.stringify(secrets));
    } catch (err) {
        const errorMessage = 'Error fetching key vault secrets';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Sends url for Microsoft login portal
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
function getRedirectLogin(req, res) {
    const { headers: { origin, host } } = req;
    const { query: { tenantId, clientId } } = url.parse(req.url, true);
    const redirectUrl = graph.getRedirectLoginUrl({
        origin, host, tenantId, clientId,
    });
    res.send(redirectUrl);
}

/**
 * Sends an graph access token
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postAccessToken(req, res) {
    try {
        const {
            query: {
                type, code, tenantId, clientId,
            },
        } = url.parse(req.url, true);
        const { headers: { origin, host, 'x-client-secret': clientSecret } } = req;
        const scope = type === 'graph' ? tokenSettings.GRAPH_SCOPE : tokenSettings.DATABRICKS_SCOPE;
        const response = await graph.postAccessToken({
            scope, code, origin, host, tenantId, clientId, clientSecret,
        });

        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(JSON.stringify(body));
    } catch (err) {
        const errorMessage = 'Error fetching token';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
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
        const {
            headers: {
                'x-refresh-token': refreshToken,
                'x-client-secret': clientSecret,
                origin,
                host,
            },
        } = req;
        const { query: { type, tenantId, clientId } } = url.parse(req.url, true);
        const scope = type === 'graph' ? tokenSettings.GRAPH_SCOPE : tokenSettings.DATABRICKS_SCOPE;
        const response = await graph.postRefreshAccessToken({
            scope, refreshToken, origin, host, tenantId, clientId, clientSecret,
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(JSON.stringify(body));
    } catch (err) {
        const errorMessage = 'Error refreshing token';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Adds an instance of an application, scim connector, from the Azure AD application gallery into directory
 * @param {Object} req Express request (galleryAppTemplateId, 8adf8e6e-67b2-4cf2-a259-e3dc5476c621, can be used to instantiate non-gallery app)
 * @param {Object} res Express response
 * @param {void}
 */
async function postScimConnectorGalleryApp(req, res) {
    try {
        const graphAccessToken = req.headers['x-access-token'];
        const { query: { galleryAppTemplateId, galleryAppName } } = url.parse(req.url, true);
        const response = await graph.postScimConnectorGalleryApp({ graphAccessToken, galleryAppTemplateId, galleryAppName });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        // Use service principal object ID for other calls: body.servicePrincipal.objectId
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error creating scim gallery app';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

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
        const graphAccessToken = req.headers['x-access-token'];
        const response = await graph.getAadGroups({ graphAccessToken, filterAadGroupDisplayName });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching aad groups';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Sends info about service principal, including app roles. May take some time to be available.
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function getServicePrincipal(req, res) {
    try {
        const { query: { servicePrincipalId } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const response = await graph.getServicePrincipal({ graphAccessToken, servicePrincipalId });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        // Use app roles assigned to the service principal for other calls: body.appRoles
        // May take some time to be available
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching service principals';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Add AAD group to service principal
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postAddAadGroupToServicePrincipal(req, res) {
    try {
        const { query: { servicePrincipalId, aadGroupId, appRoleId } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const response = await graph.postAddAadGroupToServicePrincipal({
            graphAccessToken,
            servicePrincipalId,
            aadGroupId,
            appRoleId,
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error adding aad group to scim';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Creates a provisioning job to sync the service principal
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postCreateServicePrincipalSyncJob(req, res) {
    try {
        const { query: { syncJobTemplateId, servicePrincipalId } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        // Use service principal's sync job ID for other calls: body.id
        const response = await graph.postCreateServicePrincipalSyncJob({ graphAccessToken, servicePrincipalId, syncJobTemplateId });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Creates a databricks pat
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postCreateDatabricksPat(req, res) {
    try {
        const { query: { databricksUrl, galleryAppName } } = url.parse(req.url, true);
        const databricksAccessToken = req.headers['x-access-token'];
        const response = await graph.postCreateDatabricksPat({ databricksAccessToken, databricksUrl, galleryAppName });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error creating databricks pat';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Test the connection with the third-party application
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postValidateServicePrincipalCredentials(req, res) {
    try {
        const { query: { servicePrincipalId, syncJobId, databricksUrl } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const databricksPat = req.headers['x-databricks-pat'];
        const response = await graph.postValidateServicePrincipalCredentials({
            graphAccessToken, servicePrincipalId, syncJobId, databricksUrl, databricksPat,
        });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Authorize access to third-party application via databricks workspace URL and PAT
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function putSaveServicePrincipalCredentials(req, res) {
    try {
        const { query: { servicePrincipalId, databricksUrl } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const databricksPat = req.headers['x-databricks-pat'];
        const response = await graph.putSaveServicePrincipalCredentials({
            graphAccessToken, servicePrincipalId, databricksUrl, databricksPat,
        });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Starts the provisioning job to sync the service principal
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function postStartServicePrincipalSyncJob(req, res) {
    try {
        const { query: { servicePrincipalId, syncJobId } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const response = await graph.postStartServicePrincipalSyncJob({ graphAccessToken, servicePrincipalId, syncJobId });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

/**
 * Sends the progress of the current provisioning cycle and stats
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function getServicePrincipalSyncJobStatus(req, res) {
    try {
        const { query: { servicePrincipalId, syncJobId } } = url.parse(req.url, true);
        const graphAccessToken = req.headers['x-access-token'];
        const response = await graph.getServicePrincipalSyncJobStatus({ graphAccessToken, servicePrincipalId, syncJobId });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching sync job status';
        console.error(`${errorMessage}: ${err}`); // eslint-disable-line no-console
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

module.exports = {
    getHomepage,
    getKeyvaultSecrets,
    getRedirectLogin,
    postAccessToken,
    postRefreshAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postCreateDatabricksPat,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    getServicePrincipalSyncJobStatus,
};
