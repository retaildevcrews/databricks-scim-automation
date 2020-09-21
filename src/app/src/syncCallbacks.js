const graph = require('@databricks-scim-automation/graph');

async function handleResponseErrors(response, successCode) {
    if (response.status === 204) {
        return response;
    }
    const body = await response.json();
    if (response.status !== successCode) {
        throw new Error(`FAILED> ${response.statusText} (${response.status}): ${JSON.stringify(body).split(',').join('/')}`);
    }
    return body;
}

// Checks if created valid access and refresh tokens by redeeming sign-in code
const postAccessToken = async (response) => {
    const body = await handleResponseErrors(response, 200);
    return Promise.resolve({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
    });
}

// Checks if created instance of SCIM connector gallery app
async function postScimConnectorGalleryApp(response) {
    const body = await handleResponseErrors(response, 201);
    return Promise.resolve({
        status: 'SUCCESS',
        params: { servicePrincipalId: body.servicePrincipal.objectId },
    });
}

// Checks if received usable AAD group (aadGroupId)
async function getAadGroups(response) {
    const body = await handleResponseErrors(response, 200);
    if (body.value.length === 0) {
        throw new Error('FAILED> Did not find any AAD groups');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: { aadGroupId: body.value[0].id },
    });
}

const boolNoop = bool => () => bool;
const delay = (time) => new Promise(done => setTimeout(() => done(), time));
const keepFetching = (args) => (
    async function(retries, response) {
        console.log('...');
        const {
            fn,
            waitTime = 5000, //milliseconds
            failedCallback,
            hasStatusErred = boolNoop(false),
            hasBodyErred = boolNoop(false),
        } = args;
        if (hasStatusErred(response) || await hasBodyErred(response)) {
            if (retries === 0) {
                return failedCallback(response);
            }
            await delay(waitTime);
            return await fn().then(async res => {
                return await keepFetching(args)(retries - 1, res);
            });
        }
        return response;
    }
);

// Checks if received usable service principal data (appRoleId)
// Will keep trying until hits max number of retries
const keepGettingServicePrincipal = async (response, params) => {
    const failedCallback = async (res) => {
        await handleResponseErrors(res, 200);
        throw new Error('FAILED> Unable to get app role ID from service principal');
    };
    const hasStatusErred = (res) => res.status !== 200;
    const getAppRoles = (body) => (
        body.appRoles.filter(({ isEnabled, origin, displayName }) => (
            isEnabled && origin === 'Application' && displayName === 'User'
        ))
    );
    const hasBodyErred = async (res) => {
        const clonedRes = res.clone();
        const body = await clonedRes.json();
        const hasErred = !Array.isArray(body.appRoles) || getAppRoles(body).length === 0;
        return hasErred;
    }
    const repeatedArgs = {
        fn: () => graph.getServicePrincipal(params),
        waitTime: 5000, //milliseconds
        failedCallback,
        hasStatusErred,
        hasBodyErred,
    };
    const maxRetries = 5;
    const body = await keepFetching(repeatedArgs)(maxRetries, response).then(async res => await res.json());
    return Promise.resolve({
        status: 'SUCCESS',
        params: { appRoleId: getAppRoles(body)[0].id },
    });
}

// Checks if successfully added AAD group to service principal
async function postAddAadGroupToServicePrincipal(response) {
    await handleResponseErrors(response, 201)
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJob(response) {
    const body = await handleResponseErrors(response, 201);
    return Promise.resolve({
        status: 'SUCCESS',
        params: { syncJobId: body.id },
    });
}

// Checks if able to successfully created Databricks PAT
async function postCreateDatabricksPat(response) {
    //await handleResponseErrors(response, 204);
    console.log({status: response.status, response});
    const body = await response.json();
    console.log({body});
    return Promise.resolve({
        status: 'SUCCESS',
        //params: { databricksPat: body.token_value },
        params: {  },
    });
}

// Checks if able to successfully validate credentials to connect with databricks workspace 
async function postValidateServicePrincipalCredentials(response) {
    await handleResponseErrors(response, 204);
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentials(response) {
    await handleResponseErrors(response, 204);
    return Promise.resolve({
        // status: `${event}> SUCCESS`,
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJob(response) {
    await handleResponseErrors(response, 204);
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Outputs sync job status until successful or hits max number of attempts
const  keepGettingServicePrincipalSyncJobStatus = async (response, params) => {
    const failedCallback = async (res) => {
        await handleResponseErrors(res, 200);
        throw new Error('FAILED> Unable to get successful sync job');
    };
    const hasStatusErred = (res) => res.status !== 200;
    const hasBodyErred = async (res) => {
        const body = await res.clone().json();
        const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
        return !(lastSuccessfulExecutionWithExports || lastSuccessfulExecution || (lastExecution && lastExecution.state === 'Succeeded'));
    }
    const repeatedArgs = {
        fn: () => graph.getServicePrincipalSyncJobStatus(params),
        waitTime: 5000,
        failedCallback,
        hasStatusErred,
        hasBodyErred,
    };
    const maxRetries = 10;
    await keepFetching(repeatedArgs)(maxRetries, response).then(async res => await res.json());
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

module.exports = {
    postAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    keepGettingServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postCreateDatabricksPat,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    keepGettingServicePrincipalSyncJobStatus,
};