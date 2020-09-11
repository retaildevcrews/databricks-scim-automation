require('dotenv').config();
const fetch = require('isomorphic-fetch');

/**
 * @constant
 * @type {string} Tenant ID of App
 */
const tenantId = process.env.TENANT_ID;
/**
 * @constant
 * @type {Object}
 * @property {string} appService Client ID from App Registration for Delegated Token
 * @property {string} daemon Client ID from App Registration for Application Token
 */
const clientIds = {
    appService: process.env.APP_SERVICE_CLIENT_ID,
    daemon: process.env.DAEMON_CLIENT_ID,
};
/**
 * @constant
 * @type {Object}
 * @property {string} appService Client Secret from App Registration for Delegated Token
 * @property {string} daemon Client Secret from App Registration for Application Token
 */
const clientSecrets = {
    appService: process.env.APP_SERVICE_CLIENT_SECRET,
    daemon: process.env.DAEMON_CLIENT_SECRET,
};

/**
 * Returns url with appropriate http based on localhost
 * @param {Object} args
 * @param {string|null} args.origin Indicator whether origin is usable
 * @param {string} args.host Secure host or localhost
 * @return {string} Origin best guess
 */
function getOriginUrl({ origin, host }) {
    return origin || (host.includes('localhost') ? `http://${host}` : `https://${host}`);
}

/**
 * Stringifies query params in an array
 * @param {Array<{key: string, value: string}>} params
 * @param {boolean} shouldEncode whether to encode key and value using encodeURIComponent
 * @return {string} Stringified query params
 */
function getQueryParams(params, shouldEncode = true) {
    const encode = value => shouldEncode ? encodeURIComponent(value) : value;
    return params.map(({ key, value }) => encode(key) + '=' + encode(value)).join('&');
}

/**
 * Returns url for Microsoft login portal. Login must be user of Application.
 * @param {Object} args
 * @param {string|null} args.origin Indicator whether origin is usable
 * @param {string} args.host Fallback for origin creation
 * @return {string} Url for Microsoft login portal
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
 * @external RequestAnAccessTokenPromise
 * @see {@link https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#request-an-access-token}
 * 
 * Returns an access token
 * @param {Object} args
 * @param {string} args.code Redeemable sign-in code from Microsoft login portal
 * @param {string|null} args.origin Indicator whether origin is usable
 * @param {string} args.host Fallback for origin creation
 * @return {external:RequestAnAccessTokenPromise}
 */
async function postAccessToken({ code, origin, host }) {
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
 * @external RefreshTheAccessTokenPromise
 * @see {@link https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#refresh-the-access-token}
 * 
 * Refreshes the access token
 * @param {Object} args
 * @param {string} args.refreshToken The token used to refresh the access token
 * @param {string|null} args.origin Indicator whether origin is usable
 * @param {string} args.host Fallback for origin creation
 * @return {external:RefreshTheAccessTokenPromise}
 */
async function postRefreshAccessToken({ refreshToken, origin, host }) {
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
 * @external ApplicationTemplateInstantiatePromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/applicationtemplate-instantiate?view=graph-rest-beta&tabs=http}
 * 
 * Adds an instance of an application, scim connector, from the Azure AD application gallery into directory
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.galleryAppTemplateId ID of a gallery app. Can be used to instantiate a non-gallery app: 8adf8e6e-67b2-4cf2-a259-e3dc5476c621
 * @param {string} args.galleryAppName Custom name of instantiated gallery app
 * @return {external:ApplicationTemplateInstantiatePromise}
 */
async function postScimConnectorGalleryApp({ accessToken, galleryAppTemplateId, galleryAppName }) {
    // Use service principal object ID for other calls: body.servicePrincipal.objectId
    return await fetch(`https://graph.microsoft.com/beta/applicationTemplates/${galleryAppTemplateId}/instantiate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        // displayName can be reused
        // will have unique ID
        body: JSON.stringify({ displayName: galleryAppName }),
    });
}

/**
 * @external FilteredListOfGroupObjectsPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/group-list?view=graph-rest-beta&tabs=http} 
 * 
 * Returns details about the AAD group
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.filterAadGroupDisplayName Display name of AAD group to filter by
 * @return {external:FilteredListOfGroupObjectsPromise}
 */
async function getAadGroups({ accessToken, filterAadGroupDisplayName }) {
    return await fetch(`https://graph.microsoft.com/beta/groups?filter=displayname+eq+'${filterAadGroupDisplayName}'`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * @external GetServicePrincipalPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/serviceprincipal-get?view=graph-rest-beta&tabs=http}
 * 
 * Returns info about service principal, including app roles. May take some time to be available.
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal
 * @return {external:GetServicePrincipalPromise}
 */
async function getServicePrincipal({ accessToken, servicePrincipalId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * @external GrantAnAppRoleAssignmentToAServicePrincipalPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/serviceprincipal-post-approleassignments?view=graph-rest-beta&tabs=http}
 * 
 * Add AAD group to service principal
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal (the API) which defined the app role (the application permission)
 * @param {string} args.aadGroupId ID of the client service principal to which the app role is being assigned to
 * @param {string} args.appRoleId ID of the appRole (defined on the resource service principal) to assign to the client service principal
 * @return {external:GrantAnAppRoleAssignmentToAServicePrincipalPromise}
 */
async function postAddAadGroupToServicePrincipal({ accessToken, servicePrincipalId, aadGroupId, appRoleId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/appRoleAssignments`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            resourceId: servicePrincipalId,
            principalId: aadGroupId,
            appRoleId
        }),
    });
}

/**
 * @external CreateSynchronizationJobPromise
 * @see (@link https://docs.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-post?view=graph-rest-beta&tabs=http)
 * 
 * Creates a provisioning job to sync the service principal
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal
 * @param {string} args.syncJobTemplateId One of the template IDs created for this application/service principal
 * @return {external:CreateSynchronizationJobPromise}
 */
async function postCreateServicePrincipalSyncJob({ accessToken, servicePrincipalId, syncJobTemplateId }){
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId: syncJobTemplateId }),
    });
}

/**
 * @external SynchronizationJobValidateCredentialsPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-validatecredentials?view=graph-rest-beta&tabs=http}
 * 
 * Test the connection with the third-party application
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal
 * @param {string} args.syncJobId ID of the provisioned synchronization job
 * @param {string} args.databricksUrl Credentials to validate: Databricks workspace base address/URL
 * @param {string|null} args.databricksPat Credentials to validate: Databricks workspace personal access token
 * @return {external:SynchronizationJobValidateCredentialsPromise}
 */
async function postValidateServicePrincipalCredentials({ accessToken, servicePrincipalId, syncJobId, databricksUrl, databricksPat }) {
    const secretToken = databricksPat || process.env.DATABRICKS_PAT;
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}/validateCredentials`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials: [
            { key: 'BaseAddress', value: databricksUrl },
            { key: 'SecretToken', value: secretToken },
        ]}),
    });
}

/**
 * @external SaveYourCredentialsPromise
 * @see {@link https://docs.microsoft.com/en-us/azure/active-directory/app-provisioning/application-provisioning-configure-api#save-your-credentials}
 * 
 * Authorize access to third-party application via databricks workspace URL and PAT
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of service principal
 * @param {string} args.databricksUrl Client secret used to establish trust between Azure AD and the application
 * @param {string} args.databricksPat Secret token used to establish trust between Azure AD and the application
 * @return {external:SaveYourCredentialsPromise}
 */
async function putSaveServicePrincipalCredentials({ accessToken, servicePrincipalId, databricksUrl, databricksPat}) {
    const secretToken = databricksPat || process.env.DATABRICKS_PAT;
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/secrets`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: [
            { key: 'BaseAddress', value: databricksUrl },
            { key: 'SecretToken', value: secretToken },
        ]}),
    });
}

/**
 * @external StartSynchronizationJobPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-start?view=graph-rest-beta&tabs=http}
 * 
 * Starts the provisioning job to sync the service principal
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal
 * @param {string} args.syncJobId ID of the provisioned synchronization job
 * @return {external:StartSynchronizationJobPromise}
 */
async function postStartServicePrincipalSyncJob({ accessToken, servicePrincipalId, syncJobId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * @external GetSynchronizationJobPromise
 * @see {@link https://docs.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-get?view=graph-rest-beta&tabs=http};
 * 
 * Returns the progress of the current provisioning cycle and stats
 * @param {Object} args
 * @param {string} args.accessToken Token used to authenticate request
 * @param {string} args.servicePrincipalId ID of the servicePrincipal
 * @param {string} args.syncJobId ID of the provisioned synchronization job
 * @return {external:GetSynchronizationJobPromise}
 */
async function getServicePrincipalSyncJobStatus({ accessToken, servicePrincipalId, syncJobId }) {
    return await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * Returns the steps of the sync process in the order they need to be executed
 * @return {Array<Object>} The action name and function for each ordered execution step
 */
function getSyncSteps() {
    return [
        { key: 'postAccessToken', fn: postAccessToken },
        { key: 'postScimConnectorGalleryApp', fn: postScimConnectorGalleryApp },
        { key: 'getAadGroups', fn: getAadGroups },
        { key: 'getServicePrincipal', fn: getServicePrincipal },
        { key: 'postAddAadGroupToServicePrincipal', fn: postAddAadGroupToServicePrincipal },
        { key: 'postCreateServicePrincipalSyncJob', fn: postCreateServicePrincipalSyncJob },
        { key: 'postValidateServicePrincipalCredentials', fn: postValidateServicePrincipalCredentials },
        { key: 'putSaveServicePrincipalCredentials', fn: putSaveServicePrincipalCredentials },
        { key: 'postStartServicePrincipalSyncJob', fn: postStartServicePrincipalSyncJob },
    ];
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
    getSyncSteps,
};