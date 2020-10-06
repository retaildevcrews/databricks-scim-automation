const { keepFetching, log } = require('../helpers');

// Checks if created valid access and refresh tokens by redeeming sign-in code
async function postAccessToken(response) {
    const body = await response.json();
    if (response.status !== 200) {
        throw new Error(`Unable to get tokens!\n${JSON.stringify(body)}`);
    }
    return {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
    };
}

// Checks if created instance of SCIM connector gallery app
async function postScimConnectorGalleryApp(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not add instance of SCIM connector app from AAD app gallery to directory!\n${JSON.stringify(body)}`);
    }
    params.servicePrincipalId = body.servicePrincipal.objectId; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign
    return Promise.resolve({ servicePrincipalId: body.servicePrincipal.objectId });
}

// Checks if received usable AAD group (aadGroupId)
async function getAadGroups(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not get AAD groups!\n${JSON.stringify(body)}`);
    }
    params.aadGroupId = body.value[0].id; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign
    return Promise.resolve({ aadGroupId: body.value[0].id });
}

// Checks if received usable service principal data (appRoleId)
// Will keep trying until hits max number of retries
async function getServicePrincipal(response, stepsStatus, params, graphCall) {
    let attempts = 1;
    stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Waiting...', Attempts: attempts }); // eslint-disable-line no-param-reassign
    const failedCallback = (body) => {
        stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Failed', Attempts: 5 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not get app role ID from service principal!\n${JSON.stringify(body)}`);
    };
    const hasStatusErred = (status) => {
        attempts += 1;
        const hasErred = status !== 200;
        if (hasErred) {
            stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Waiting...', Attempts: attempts }); // eslint-disable-line no-param-reassign
        }
    return hasErred;
    };
    const hasBodyErred = (body) => {
        const hasErred = body.appRoles.filter(({ isEnabled, origin, displayName }) => (isEnabled && origin === 'Application' && displayName === 'User')).length === 0;
        if (hasErred) {
            stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Waiting...', Attempts: attempts }); // eslint-disable-line no-param-reassign
        }
        return hasErred;
    };
    const repeatedArgs = {
        fn: () => graphCall(params),
        failedCallback,
        hasStatusErred,
        hasBodyErred,
    };
    const body = await keepFetching(repeatedArgs)(5, response).then((res) => res.json());
    params.appRoleId = body.appRoles.filter(({ isEnabled, origin, displayName }) => ( // eslint-disable-line no-param-reassign
        isEnabled && origin === 'Application' && displayName === 'User'
    ))[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Success', Attempts: attempts }); // eslint-disable-line no-param-reassign
    return Promise.resolve({ appRoleId: params.appRoleId });
}

// Checks if first email received is a usable directory user (objectId)
async function getUserForOwner1(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        stepsStatus = log.table(stepsStatus, { Action: 'getUserForOwner1', Status: 'Failed', Attempts: 1}); // eslint-disable-line no-param-reassign
        throw new Error(`Could not get a user objectId from provided email address to assign as owner!\n${JSON.stringify(body)}`);
    }
    params.directoryObjectId1 = body.value[0].id; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'getUserForOwner1', Status: 'Success', Attempts: 1}); // eslint-disable-line no-param-reassign
    return Promise.resolve({ directoryObjectId1: body.value.id });
}

// Checks if first owner was successfully added to SCIM Connector
async function postAddOwner1(response, stepsStatus, params) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddOwner1', Status: 'Failed', Attempts: 1}); // eslint-disable-line no-param-reassign
        const body = await response.json();
        throw new Error(`Could not assign provided user as owner!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddOwner1', Status: 'Success', Attempts: 1}); // eslint-disable-line no-param-reassign
    return Promise.resolve({});
}

// Checks if second email received is a usable directory user (objectId)
async function getUserForOwner2(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        stepsStatus = log.table(stepsStatus, { Action: 'getUserForOwner2', Status: 'Failed', Attempts: 1}); // eslint-disable-line no-param-reassign
        throw new Error(`Could not get a user objectId from provided email address to assign as owner!\n${JSON.stringify(body)}`);
    }
    params.directoryObjectId2 = body.value[0].id; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'getUserForOwner2', Status: 'Success', Attempts: 1}); // eslint-disable-line no-param-reassign
    return Promise.resolve({ directoryObjectId2: body.value.id });
}

// Checks if second owner was successfully added to SCIM Connector
async function postAddOwner2(response, stepsStatus, params) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddOwner2', Status: 'Failed', Attempts: 1}); // eslint-disable-line no-param-reassign
        const body = await response.json();
        throw new Error(`Could not assign provided user as owner!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddOwner2', Status: 'Success', Attempts: 1}); // eslint-disable-line no-param-reassign
    return Promise.resolve({});
}

// Checks if successfully added AAD group to service principal
async function postAddAadGroupToServicePrincipal(response, stepsStatus) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not add AAD group to the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign, no-unused-vars
    return Promise.resolve({});
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJob(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not provision a job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    params.syncJobId = body.id; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign
    return Promise.resolve({ syncJobId: body.id });
}

// Checks if able to successfully created Databricks PAT
async function postCreateDatabricksPat(response, stepsStatus, params) {
    const body = await response.json();
    if (response.status !== 200) {
        stepsStatus = log.table(stepsStatus, { Action: 'postCreateDatabricksPat', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        throw new Error(`Could not create a databricks workspace pat!\n${JSON.stringify(body)}`);
    }
    params.databricksPat = body.token_value; // eslint-disable-line no-param-reassign
    stepsStatus = log.table(stepsStatus, { Action: 'postCreateDatabricksPat', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign
    return Promise.resolve({ databricksPat: body.token_value });
}

// Checks if able to successfully validate credentials to connect with databricks workspace
async function postValidateServicePrincipalCredentials(response, stepsStatus) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign, no-unused-vars
    return Promise.resolve({});
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentials(response, stepsStatus) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign, no-unused-vars
    return Promise.resolve({});
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJob(response, stepsStatus) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 }); // eslint-disable-line no-param-reassign
        const body = await response.json();
        throw new Error(`Could not start the provisioned job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Success', Attempts: 1 }); // eslint-disable-line no-param-reassign, no-unused-vars
    return Promise.resolve({});
}

module.exports = {
    postAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    getServicePrincipal,
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
};
