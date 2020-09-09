require('dotenv').config();
const fetch = require('isomorphic-fetch');

// From App registrations
const tenantId = process.env.TENANT_ID;
const clientIds = {
    appService: process.env.APP_SERVICE_CLIENT_ID,
    daemon: process.env.DAEMON_CLIENT_ID,
};
const clientSecrets = {
    appService: process.env.APP_SERVICE_CLIENT_SECRET,
    daemon: process.env.DAEMON_CLIENT_SECRET,
};

/**
 * Returns url with appropriate http based on localhost
 * @param {Object.<string>}
 * @return {string}
 */
function getOriginUrl({ origin, host }) {
    return origin || (host.includes('localhost') ? `http://${host}` : `https://${host}`);
}

/**
 * Stringifies query params in an array
 * @param {Array.<string>} params
 * @param {boolean} shouldEncode
 * @return {string}
 */
function getQueryParams(params, shouldEncode = true) {
    const encode = value => shouldEncode ? encodeURIComponent(value) : value;
    return params.map(({ key, value }) => encode(key) + '=' + encode(value)).join('&');
}

/**
 * Returns url for Microsoft login portal. Login must be user of Application.
 * @param {Object.<string>}
 * @return {string}
 */
function getRedirectLoginUrl({ origin, host }) {
    const params = [
        { key: 'client_id', value: clientIds.appService },
        { key: 'response_type', value: 'code' },
        { key: 'redirect_uri', value: getOriginUrl({ origin, host }) },
        { key: 'response_mode', value: 'query' },
        { key: 'scope', value: 'openid%20offline_access%20https%3A%2F%2Fgraph.microsoft.com%2F.default' },
        { key: 'state', value: 12345 },
    ];
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${getQueryParams(params, false)}`;
}

/**
 * Return an access token
 * @param {string} code String generated from Microsoft login portal
 * @param {Object.<string>} 
 * @return {Promise} Object containing access token, refresh token, etc.
 */
async function postAccessToken(code, { origin, host }) {
    const params = [
        { key: 'client_id', value: clientIds.appService },
        { key: 'scope', value: 'https://graph.microsoft.com/mail.read' },
        { key: 'redirect_uri', value: getOriginUrl({ origin, host }) },
        { key: 'grant_type', value: 'authorization_code' },
        { key: 'client_secret', value: clientSecrets.appService },
        { key: 'code', value: code },
    ];
    return await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: getQueryParams(params),
    });
}

/**
 * Refreshes the access token
 * @param {string} refreshToken 
 * @param {Object.<string>} 
 * @return {Promise} Object containing access token, refresh token, etc.
 */
async function postRefreshAccessToken(refreshToken, { origin, host }) {
    const params = [
        { key: 'client_id', value: clientIds.appService },
        { key: 'scope', value: 'https://graph.microsoft.com/mail.read' },
        { key: 'redirect_uri', value: getOriginUrl({ origin, host }) },
        { key: 'grant_type', value: 'refresh_token' },
        { key: 'client_secret', value: clientSecrets.appService },
        { key: 'refresh_token', value: refreshToken },
    ];
    return await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: getQueryParams(params),
    });
}

/**
 * Adds an instance of an application, scim connector, from the Azure AD application gallery into directory
 * @param {string} accessToken
 * @param {string} templateId ID of a gallery app. Can be used to instantiate a non-gallery app: 8adf8e6e-67b2-4cf2-a259-e3dc5476c621
 * @param {string} appName Name of instantiated gallery app
 * @return {Promise} Contains body.servicePrincipal.objectId for subsequent calls
 */
async function postScimConnectorGalleryApp(accessToken, templateId, appName) {
    // Use service principal object ID for other calls: body.servicePrincipal.objectId
    return await fetch(`https://graph.microsoft.com/beta/applicationTemplates/${templateId}/instantiate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        // displayName can be reused
        // will have unique ID
        body: JSON.stringify({ displayName: appName }),
    });
}

/**
 * Returns details about the AAD group
 * @param {string} accessToken 
 * @param {string} filterDisplayName Display name of AAD group
 * @return {Promise} Contains name and object ID of AAD group. Object ID used in subsequent calls, body.value[{ id }]
 */
async function getAadGroups(accessToken, filterDisplayName) {
    return await fetch(`https://graph.microsoft.com/beta/groups?filter=displayname+eq+'${filterDisplayName}'`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * Returns info about service principal, including app roles. May take some time to be available.
 * @param {string} accessToken 
 * @param {string} objectId Service principal ID
 * @return {Promise} Contains info about service principal. App roles used in subsequent calls, body.appRoles
 */
async function getServicePrincipal(accessToken, objectId) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${objectId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * Add AAD group to service principal
 * @param {string} accessToken 
 * @param {Object.<string>} 
 * @return {Promise} Contains status of adding AAD group to service principal
 */
async function postAddAadGroupToServicePrincipal(accessToken, { resourceId, principalId, appRoleId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${resourceId}/appRoleAssignments`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceId, principalId, appRoleId }),
    });
}

/**
 * Creates a provisioning job to sync the service principal
 * @param {string} accessToken 
 * @param {Object.<string>}
 * @return {Promise} Contains service principal's provisioning job ID, which is used in subsequent calls, body.id
 */
async function postCreateServicePrincipalSyncJob(accessToken, { servicePrincipalObjectId, templateId }){
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalObjectId}/synchronization/jobs`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
    });
}

/**
 * Test the connection with the third-party application
 * @param {string} accessToken 
 * @param {Object.<string>} 
 * @return {Promise} Contains status of connection validation
 */
async function postValidateServicePrincipalCredentials(accessToken, { servicePrincipalObjectId, syncJobId, databricksUrl, secretToken }) {
    const databricksPat = secretToken || process.env.DATABRICKS_PAT;
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalObjectId}/synchronization/jobs/${syncJobId}/validateCredentials`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials: [
            { key: 'BaseAddress', value: databricksUrl },
            { key: 'SecretToken', value: databricksPat },
        ]}),
    });
}

/**
 * Authorize access to third-party application via databricks workspace URL and PAT
 * @param {string} accessToken 
 * @param {Object.<string>}
 * @return {Promise} Contains status of authorizing access to third-party application
 */
async function putSaveServicePrincipalCredentials(accessToken, { servicePrincipalObjectId, databricksUrl, secretToken}) {
    const databricksPat = secretToken || process.env.DATABRICKS_PAT;
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalObjectId}/synchronization/secrets`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: [
            { key: 'BaseAddress', value: databricksUrl },
            { key: 'SecretToken', value: databricksPat },
        ]}),
    });
}

/**
 * Starts the provisioning job to sync the service principal
 * @param {string} accessToken
 * @param {Object.<string>}
 * @return {Promise} Contains status of starting the provisioning job to sync the service principal
 */
async function postStartServicePrincipalSyncJob(accessToken, { servicePrincipalObjectId, syncJobId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalObjectId}/synchronization/jobs/${syncJobId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * Returns the progress of the current provisioning cycle and stats
 * @param {string} accessToken 
 * @param {Object.<string>}
 * @return {Promise} Contains progress of current provisioning cycle and stats
 */
async function getServicePrincipalSyncJobStatus(accessToken, { servicePrincipalObjectId, syncJobId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalObjectId}/synchronization/jobs/${syncJobId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

function delay(time) {
    return new Promise(done => setTimeout(() => done(), time) );
}

const noop = bool => () => bool;
const keepFetching = (fn, errorMessage, hasStatusErred=noop(false), hasBodyErred=noop(false)) => async function(retries) {
    if (retries === 0) {
        throw new Error(errorMessage);
    }
    await delay(5000);
    return await fn().then(async response => {
        if (hasStatusErred(response.status)) {
            return await keepFetching(fn, errorMessage, hasStatusErred, hasBodyErred)(retries - 1)
        }
        const body = await response.json();
        if (hasBodyErred(body)) {
            return await keepFetching(fn, errorMessage, hasStatusErred, hasBodyErred)(retries - 1)
        }
        return body;
    });
};

const responseParams = {
    scimServicePrincipalObjectId: undefined,
    aadGroupId: undefined,
    appRoleId: undefined,
    servicePrincipalSyncJobId: undefined,
};

async function startSyncProcess(inputParams) {
    const {
        accessToken,
        refreshToken,
        scimConnectorGalleryAppTemplateId,
        scimConnectorGalleryAppName,
        aadGroupFilterDisplayName,
        syncJobTemplateId,
        databricksWorkspaceUrl,
        databricksWorkspacePat,
    } = inputParams;
    let {
        scimServicePrincipalObjectId,
        aadGroupId,
        appRoleId,
        servicePrincipalSyncJobId,
    } = responseParams;

    try {
        console.log("\nCreating instance of SCIM connector app from AAD app gallery and adding to directory...");
        scimServicePrincipalObjectId = await postScimConnectorGalleryApp(accessToken, scimConnectorGalleryAppTemplateId, scimConnectorGalleryAppName)
            .then((response) => {
                if (response.status !== 201) {
                    throw new Error('Could not add instance of SCIM connector app from AAD app gallery to directory!');
                }
                return response.json();
            })
            .then((body) => {
                console.log('Successfully created and added an instance of SCIM connector app from AAD app gallery to directory!');
                return body.servicePrincipal.objectId;
            });

        console.log("\nGetting AAD groups...");
        aadGroupId = await getAadGroups(accessToken, aadGroupFilterDisplayName)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error('Could not get AAD groups!');
                }
                return response.json();
            })
            .then((body) => {
                if (body.value.length === 0) {
                    throw new Error('Did not get any AAD groups!');
                }
                console.log('Successfully retreived an AAD group!');
                return body.value[0].id;
            });

        const keepFetchingGetServicePrincipal = keepFetching(
            () => getServicePrincipal(accessToken, scimServicePrincipalObjectId),
            'Could not get app role ID from service principal!',
            (status) => (status !== 200),
            (body) => (body.appRoles.filter(({ isEnabled, origin, displayName }) => (isEnabled && origin === 'Application' && displayName === 'User')).length === 0)
        );
        console.log("\nGetting app role ID from service principal...");
        appRoleId = await keepFetchingGetServicePrincipal(5)
            .then((body) => (
                body.appRoles.filter(({ isEnabled, origin, displayName }) => (isEnabled && origin === 'Application' && displayName === 'User'))[0].id
            ));
        console.log('Successfully retreived an app role from the service principal!');

        console.log("\nAdding AAD group to service principal...");
        await postAddAadGroupToServicePrincipal(accessToken, {
            resourceId: scimServicePrincipalObjectId,
            principalId: aadGroupId,
            appRoleId,
        }).then((response) => {
            if (response.status !== 201) {
                throw new Error('Could not add AAD group to the service principal!');
            }
            return response.json();
        })
        .then((body) => {
            console.log('Successfully added the AAD group to the service principal!');
        });

        console.log("\nCreating a provisioning job to sync the service principal...");
        servicePrincipalSyncJobId = await postCreateServicePrincipalSyncJob(accessToken, {
            servicePrincipalObjectId: scimServicePrincipalObjectId,
            templateId: syncJobTemplateId,
        }).then((response) => {
            if (response.status !== 201) {
                throw new Error('Could not provision a job to sync the service principal!');
            }
            return response.json();
        }).then((body) => {
            console.log('Successfully created a provisioning to job to sync the service principal!');
            return body.id;
        });

        console.log("\nTesting the connection with the third-party application...");
        await postValidateServicePrincipalCredentials(accessToken, {
            servicePrincipalObjectId: scimServicePrincipalObjectId,
            syncJobId: servicePrincipalSyncJobId,
            databricksUrl: databricksWorkspaceUrl,
            secretToken: databricksWorkspacePat,
        }).then((response) => {
            if (response.status !== 204){
                throw new Error('Could not validate a connection with the third-party application!');
            }
            console.log('Successfully validated the connection to the third-party application!');
        });

        console.log("\nAuthorizing access to third-party application...");
        await putSaveServicePrincipalCredentials(accessToken, {
            servicePrincipalObjectId: scimServicePrincipalObjectId,
            databricksUrl: databricksWorkspaceUrl,
            secretToken: databricksWorkspacePat,
        }).then(async (response) => {
            if (response.status !== 204){
                throw new Error('Could not validate a connection with the third-party application!');
            }
            console.log('Successfully authorized access connection to the third-party application!');
        });

        console.log("\nStarting the provisioning job to sync the service principal...");
        await postStartServicePrincipalSyncJob(accessToken, {
            servicePrincipalObjectId: scimServicePrincipalObjectId,
            syncJobId: servicePrincipalSyncJobId,
        }).then((response) => {
            if (response.status !== 204) {
                throw new Error('Could not start the provisioning job to sync the service principal!');
            }
            console.log('Successfully started the provisioning job to sync the service principal!');
        });

        console.log("\nGetting status of synchronizing...");
        const keepFetchingGetServicePrincipalSyncJobStatus = keepFetching(
            async () => await getServicePrincipalSyncJobStatus(accessToken, {
                servicePrincipalObjectId: scimServicePrincipalObjectId,
                syncJobId: servicePrincipalSyncJobId,
            }),
            'Could not get a successful status for the sync job!',
            (status) => (status !== 200),
            (body) => {
                const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
                lastExecution && console.log(`Last Execution (${lastExecution.state}) began at ${lastExecution.timeBegan} and ended at ${lastExecution.timeEnded}`);
                lastSuccessfulExecution && console.log(`Last Successful Execution (${lastSuccessfulExecution.state}) began at ${lastSuccessfulExecution.timeBegan} and ended at ${lastSuccessfulExecution.timeEnded}`);
                lastSuccessfulExecutionWithExports && console.log(`Last Successful Execution with Exports (${lastSuccessfulExecutionWithExports.state}) began at ${lastSuccessfulExecutionWithExports.timeBegan} and ended at ${lastSuccessfulExecutionWithExports.timeEnded}`);
                const hasErred = !(lastSuccessfulExecution || lastSuccessfulExecutionWithExports || lastExecution.state === 'Succeeded');
                return hasErred;
            }
        )
        await keepFetchingGetServicePrincipalSyncJobStatus(10);
        return Promise.resolve('COMPLETED SYNC!');
    } catch(err) {
        return Promise.reject(err);
    }
}

module.exports = {
    getOriginUrl,
    getRedirectLoginUrl,
    postAccessToken,
    postRefreshAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    getServicePrincipalSyncJobStatus,
    startSyncProcess,
};