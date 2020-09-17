// Checks if created valid access and refresh tokens by redeeming sign-in code
const postAccessToken = async (response) => {
    const body = await response.json();
    if (response.status !== 200) {
        throw new Error(`Unable to get tokens!\n${JSON.stringify(body)}`);
    }
    return Promise.resolve({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
    });
}

// Checks if created instance of SCIM connector gallery app
async function postScimConnectorGalleryApp(response) {
    const body = await response.json();
    if (response.status !== 201) {
        throw new Error('FAILED');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: { servicePrincipalId: body.servicePrincipal.objectId },
    });
}

// Checks if received usable AAD group (aadGroupId)
async function getAadGroups(response) {
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        throw new Error('FAILED');
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
const keepGettingServicePrincipal = (graphCall) => async (response) => {
    let attempts = 0;
    const failedCallback = (res) => {
        throw new Error('FAILED');
    };
    const hasStatusErred = (res) => {
        attempts += 1;
        return res.status !== 200;
    }
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
        fn: graphCall,
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
    const body = await response.json();
    if (response.status !== 201) {
        throw new Error('FAILED');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJob(response) {
    const body = await response.json();
    if (response.status !== 201) {
        throw new Error('FAILED');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: { syncJobId: body.id },
    });
}

// Checks if able to successfully validate credentials to connect with databricks workspace 
async function postValidateServicePrincipalCredentials(response) {
    if (response.status !== 204) {
        throw new Error('FAILED');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentials(response) {
    if (response.status !== 204){
        throw new Error('FAILED');
    }
    return Promise.resolve({
        // status: `${event}> SUCCESS`,
        status: 'SUCCESS',
        params: {},
    });
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJob(response) {
    if (response.status !== 204) {
        const body = await response.json();
        throw new Error('FAILED');
    }
    return Promise.resolve({
        status: 'SUCCESS',
        params: {},
    });
}

// Outputs sync job status until successful or hits max number of attempts
const  keepGettingServicePrincipalSyncJobStatus = (graphCall) => async (response) => {
    const failedCallback = () => { throw new Error('FAILED') };
    const hasStatusErred = (res) => res.status !== 200;
    const hasBodyErred = async (res) => {
        const body = await res.clone().json();
        const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
        return !(lastSuccessfulExecutionWithExports || lastSuccessfulExecution || (lastExecution && lastExecution.state === 'Succeeded'));
    }
    const repeatedArgs = {
        fn: graphCall,
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
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    keepGettingServicePrincipalSyncJobStatus,
};