const log = require('./log');
const { keepFetching } = require('./helpers');

// Checks if created valid access and refresh tokens by redeeming sign-in code
async function postAccessToken(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAccessToken', Status: 'Failed', Attempts: 1 });
        throw new Error(`Unable to get tokens!\n${JSON.stringify(body)}`);
    }
    params.accessToken = body.access_token;
    params.refreshToken = body.refresh_token;
    stepsStatus = log.table(stepsStatus, { Action: 'postAccessToken', Status: 'Success', Attempts: 1 });
    return Promise.resolve({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
    });
}

// Checks if created instance of SCIM connector gallery app
async function postScimConnectorGalleryApp(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp',  Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not add instance of SCIM connector app from AAD app gallery to directory!\n${JSON.stringify(body)}`);
    }
    params.servicePrincipalId = body.servicePrincipal.objectId;
    stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp',  Status: 'Success', Attempts: 1 });
    return Promise.resolve({ servicePrincipalId: body.servicePrincipal.objectId });
}

// Checks if received usable AAD group (aadGroupId)
async function getAadGroups(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not get AAD groups!\n${JSON.stringify(body)}`);
    }
    params.aadGroupId = body.value[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Success', Attempts: 1 });
    return Promise.resolve({ aadGroupId: body.value[0].id });
}

// Checks if received usable service principal data (appRoleId)
// Will keep trying until hits max number of retries
async function getServicePrincipal(response, stepsStatus, params, graphCall ) {
    let attempts = 0;
    const failed = (body) => {
        stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Failed', Attempts: 5 });
        throw new Error(`Could not get app role ID from service principal!\n${JSON.stringify(body)}`);
    };
    const hasStatusErred = (status) => {
        attempts += 1;
        const hasErred = status !== 200;
        if (hasErred) { stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Waiting...', Attempts: attempts }) }
        return hasErred; 
    }
    const hasBodyErred = (body) => {
        const hasErred = body.appRoles.filter(({ isEnabled, origin, displayName }) => (isEnabled && origin === 'Application' && displayName === 'User')).length === 0;
        if (hasErred) { stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Waiting...', Attempts: attempts }) }
        return hasErred;
    }
    const keepGettingServicePrincipal = keepFetching(
        () => graphCall(params),
        failed,
        hasStatusErred,
        hasBodyErred
    );
    let body = await response.json();
    // Check if initial call failed
    if (hasStatusErred(response.status) || hasBodyErred(body)) {
        body = await keepGettingServicePrincipal(4, '');
    }
    params.appRoleId = body.appRoles.filter(({ isEnabled, origin, displayName }) => (
        isEnabled && origin === 'Application' && displayName === 'User'
    ))[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Success', Attempts: attempts });
    return Promise.resolve({ appRoleId: params.appRoleId });
}

// Checks if successfully added AAD group to service principal
async function postAddAadGroupToServicePrincipal(response, stepsStatus) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not add AAD group to the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJob(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not provision a job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    params.syncJobId = body.id;
    stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Success', Attempts: 1 });
    return Promise.resolve({ syncJobId: body.id });
}

// Checks if able to successfully validate credentials to connect with databricks workspace 
async function postValidateServicePrincipalCredentials(response, stepsStatus) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentials(response, stepsStatus) {
    if (response.status !== 204){
        stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJob(response, stepsStatus) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not start the provisioned job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

module.exports = {
    postAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
};