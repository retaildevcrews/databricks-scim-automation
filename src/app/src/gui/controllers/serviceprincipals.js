const url = require('url');
const graph = require('@databricks-scim-automation/graph');

/**
 * Sends info about service principal, including app roles. May take some time to be available.
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
async function getServicePrincipal(req, res) {
    try {
        const { query: { servicePrincipalId } } = url.parse(req.url, true);
        const accessToken = req.headers['x-access-token'];
        const response = await graph.getServicePrincipal({ accessToken, servicePrincipalId });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        // Use app roles assigned to the service principal for other calls: body.appRoles
        // May take some time to be available
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching service principals';
        console.error(errorMessage + ': ', err);
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
        const accessToken = req.headers['x-access-token'];
        const response = await graph.postAddAadGroupToServicePrincipal({
            accessToken,
            servicePrincipalId,
            aadGroupId,
            appRoleId,
        });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error adding aad group to scim';
        console.error(errorMessage + ': ', err);
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
        const accessToken = req.headers['x-access-token'];
        // Use service principal's sync job ID for other calls: body.id
        const response = await graph.postCreateServicePrincipalSyncJob({ accessToken, servicePrincipalId, syncJobTemplateId });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
        res
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
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
        const accessToken = req.headers['x-access-token'];
        const databricksPat = req.headers['x-databricks-pat'] === 'default' ? undefined : req.headers['x-databricks-pat'];
        const response = await graph.postValidateServicePrincipalCredentials({ accessToken, servicePrincipalId, syncJobId, databricksUrl, databricksPat });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
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
        const accessToken = req.headers['x-access-token'];
        const databricksPat = req.headers['x-databricks-pat'] === 'default' ? undefined : req.headers['x-databricks-pat'];
        const response = await graph.putSaveServicePrincipalCredentials({ accessToken, servicePrincipalId, databricksUrl, databricksPat });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
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
        const accessToken = req.headers['x-access-token'];
        const response = await graph.postStartServicePrincipalSyncJob({ accessToken, servicePrincipalId, syncJobId });
        res.sendStatus(response.status);
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
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
        const accessToken = req.headers['x-access-token'];
        const response = await graph.getServicePrincipalSyncJobStatus({ accessToken, servicePrincipalId, syncJobId });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch (err) {
        const errorMessage = 'Error fetching sync job status';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

module.exports = {
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    getServicePrincipalSyncJobStatus,
}