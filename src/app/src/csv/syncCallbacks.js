const graph = require('@databricks-scim-automation/graph');
const { handleResponseErrors, keepFetching } = require('../helpers');

// Checks if created valid access and refresh tokens by redeeming sign-in code
const postAccessToken = async (response) => {
    const body = await handleResponseErrors(response, 200);
    return Promise.resolve({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
    });
};

// Checks if created instance of SCIM connector gallery app
async function postScimConnectorGalleryApp(response, params) {
    const body = await handleResponseErrors(response, 201);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { servicePrincipalId: body.servicePrincipal.objectId },
    });
}

// Checks if received usable AAD group (aadGroupId)
async function getAadGroups(response, params) {
    const body = await handleResponseErrors(response, 200);
    if (body.value.length === 0) {
        throw new Error('FAILED> Did not find any AAD groups');
    }
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { aadGroupId: body.value[0].id },
    });
}

// Checks if received usable service principal data (appRoleId)
// Will keep trying until hits max number of retries
const keepGettingServicePrincipal = async (response, params) => {
    const failedCallback = async (res) => {
        await handleResponseErrors(res, 200);
        throw new Error('FAILED> Unable to get app role ID from service principal');
    };
    const hasStatusErred = (status) => status !== 200;
    const getAppRoles = (body) => (
        body.appRoles.filter(({ isEnabled, origin, displayName }) => (
            isEnabled && origin === 'Application' && displayName === 'User'
        ))
    );
    const hasBodyErred = (body) => (!Array.isArray(body.appRoles) || getAppRoles(body).length === 0);
    const repeatedArgs = {
        fn: () => graph.getServicePrincipal(params),
        failedCallback,
        hasStatusErred,
        hasBodyErred,
    };
    const maxRetries = 5;
    const body = await keepFetching(repeatedArgs)(maxRetries, response).then((res) => res.json());
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { appRoleId: getAppRoles(body)[0].id },
    });
};

// Checks if first email received is a usable directory user (objectId)
async function getUserForOwner1(response, params) {
    const body = await handleResponseErrors(response, 200);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { directoryObjectId1: body.value[0].id },
    });
}

// Checks if first owner was successfully added to SCIM Connector
async function postAddOwner1(response, params) {
    await handleResponseErrors(response, 204);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if second email received is a usable directory user (objectId)
async function getUserForOwner2(response, params) {
    const body = await handleResponseErrors(response, 200);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { directoryObjectId2: body.value[0].id },
    });
}

// Checks if second owner was successfully added to SCIM Connector
async function postAddOwner2(response, params) {
    await handleResponseErrors(response, 204);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully added AAD group to service principal
async function postAddAadGroupToServicePrincipal(response, params) {
    await handleResponseErrors(response, 201);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJob(response, params) {
    const body = await handleResponseErrors(response, 201);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { syncJobId: body.id },
    });
}

// Checks if able to successfully created Databricks PAT
async function postCreateDatabricksPat(response, params) {
    const body = await handleResponseErrors(response, 200);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: { databricksPat: body.token_value },
    });
}

// Checks if able to successfully validate credentials to connect with databricks workspace
async function postValidateServicePrincipalCredentials(response, params) {
    await handleResponseErrors(response, 204);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentials(response, params) {
    await handleResponseErrors(response, 204);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJob(response, params) {
    await handleResponseErrors(response, 204);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Outputs sync job status until successful or hits max number of attempts
const keepGettingServicePrincipalSyncJobStatus = async (response, params) => {
    const failedCallback = async (res) => {
        await handleResponseErrors(res, 200);
        throw new Error('FAILED> Unable to get successful sync job');
    };
    const hasStatusErred = (status) => status !== 200;
    const hasBodyErred = (body) => {
        const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
        return !(lastSuccessfulExecutionWithExports || lastSuccessfulExecution || (lastExecution && lastExecution.state === 'Succeeded'));
    };
    const repeatedArgs = {
        fn: () => graph.getServicePrincipalSyncJobStatus(params),
        failedCallback,
        hasStatusErred,
        hasBodyErred,
    };
    const maxRetries = 10;
    await keepFetching(repeatedArgs)(maxRetries, response);
    params.progressBar.increment();
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
};

module.exports = {
    postAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    keepGettingServicePrincipal,
    getUserForOwner1,
    postAddOwner1,
    getUserForOwner2,
    postAddOwner2,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postCreateDatabricksPat,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    keepGettingServicePrincipalSyncJobStatus,
};
