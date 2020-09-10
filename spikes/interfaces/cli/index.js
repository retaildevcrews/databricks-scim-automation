require('dotenv').config();
const express = require('express');
const url = require('url');
const Promise = require('bluebird');
const graph = require('@databricks-scim-automation/graph');
const logo = require('./logo');
const prompts = require('./prompts');
const log = require('./log');

const port = process.env.PORT || 8000;
const host = `localhost:${port}`;
const redirectLoginUrl = graph.getRedirectLoginUrl({ host });
const app = express();

async function getUserInputs() {
    // Required User Inputs and Default Values
    const inputPrompts = [
        { message: 'SCIM connector gallery app template ID', key: 'scimConnectorGalleryAppTemplateId', defaultInput: '9c9818d2-2900-49e8-8ba4-22688be7c675' },
        { message: 'SCIM connector gallery app display name', key: 'scimConnectorGalleryAppName', defaultInput: undefined },
        { message: 'filter AAD group by display name', key: 'aadGroupFilterDisplayName', defaultInput: 'Databricks-SCIM' },
        { message: 'sync job template ID', key: 'syncJobTemplateId', defaultInput: 'dataBricks' },
        { message: `databricks workspace URL`, key: 'databricksWorkspaceUrl', defaultInput: process.env.DATABRICKS_URL },
        { message: `databricks workspace PAT`, key: 'databricksWorkspacePat', defaultInput: process.env.DATABRICKS_PAT },
    ];
    try {
        // Get required inputs from user
        const newInputs = await inputPrompts.reduce(async (inputs, { message, key, defaultInput}) => {
            const aggInputs = await inputs;
            const currInput = await prompts.userInput(message, defaultInput).catch(err => { throw new Error(err) });
            return { ...aggInputs, [key]: currInput };  
        }, {});
        prompts.closeUserInput();
        return newInputs;

    } catch(err) {
        console.error(err);
        process.exit(0);
    }
}

const noop = bool => () => bool;
const delay = (time) => new Promise(done => setTimeout(() => done(), time));
const keepFetching = (fn, failed, hasStatusErred=noop(false), hasBodyErred=noop(false)) => async function(retries, body) {
    if (retries === 0) {
        return failed(body);
    }
    await delay(5000);
    return await fn().then(async response => {
        const body = await response.json();
        if (hasStatusErred(response.status)) {
            return await keepFetching(fn, failed, hasStatusErred, hasBodyErred)(retries - 1, body);
        }
        if (hasBodyErred(body)) {
            return await keepFetching(fn, failed, hasStatusErred, hasBodyErred)(retries - 1, body);
        }
        return body;
    });
};

let params = {};
let stepsStatus = [];

// Creates access and refresh token by redeeming sign-in code
async function postAccessTokenCallback(graphCall) {
    const response = await graphCall(params.code, { host });
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

async function postScimConnectorGalleryAppCallback(graphCall) {
    const response = await graphCall(params.accessToken, params.scimConnectorGalleryAppTemplateId, params.scimConnectorGalleryAppName);
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp',  Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not add instance of SCIM connector app from AAD app gallery to directory!\n${JSON.stringify(body)}`);
    }
    params.scimServicePrincipalObjectId = body.servicePrincipal.objectId;
    stepsStatus = log.table(stepsStatus, { Action: 'postScimConnectorGalleryApp',  Status: 'Success', Attempts: 1 });
    return Promise.resolve({ scimServicePrincipalObjectId: body.servicePrincipal.objectId });
}

async function getAadGroupsCallback(graphCall) {
    const response = await graphCall(params.accessToken, params.aadGroupFilterDisplayName);
    const body = await response.json();
    if (response.status !== 200 || body.value.length === 0) {
        stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not get AAD groups!\n${JSON.stringify(body)}`);
    }
    params.aadGroupId = body.value[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getAadGroups', Status: 'Success', Attempts: 1 });
    return Promise.resolve({ aadGroupId: body.value[0].id });
}

async function getServicePrincipalCallback(graphCall) {
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
        () => graphCall(params.accessToken, params.scimServicePrincipalObjectId),
        failed,
        hasStatusErred,
        hasBodyErred
    );
    const body = await keepGettingServicePrincipal(5, '');
    params.appRoleId = body.appRoles.filter(({ isEnabled, origin, displayName }) => (
        isEnabled && origin === 'Application' && displayName === 'User'
    ))[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Success', Attempts: attempts });
    return Promise.resolve({ appRoleId: params.appRoleId });
}

async function postAddAadGroupToServicePrincipalCallback(graphCall) {
    const response = await graphCall(params.accessToken, {
        resourceId: params.scimServicePrincipalObjectId,
        principalId: params.aadGroupId,
        appRoleId: params.appRoleId,
    });
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not add AAD group to the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

async function postCreateServicePrincipalSyncJobCallback(graphCall) {
    const response = await graphCall(params.accessToken, {
        servicePrincipalObjectId: params.scimServicePrincipalObjectId,
        templateId: params.syncJobTemplateId,
    });
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not provision a job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    params.servicePrincipalSyncJobId = body.id;
    stepsStatus = log.table(stepsStatus, { Action: 'postCreateServicePrincipalSyncJob', Status: 'Success', Attempts: 1 });
    return Promise.resolve({ servicePrincipalSyncJobId: body.id });
}

async function postValidateServicePrincipalCredentialsCallback(graphCall) {
    const response = await graphCall(params.accessToken, {
        servicePrincipalObjectId: params.scimServicePrincipalObjectId,
        syncJobId: params.servicePrincipalSyncJobId,
        databricksUrl: params.databricksWorkspaceUrl,
        secretToken: params.databricksWorkspacePat,
    });
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

async function putSaveServicePrincipalCredentialsCallback(graphCall) {
    const response = await graphCall(params.accessToken, {
        servicePrincipalObjectId: params.scimServicePrincipalObjectId,
        databricksUrl: params.databricksWorkspaceUrl,
        secretToken: params.databricksWorkspacePat,
    });
    if (response.status !== 204){
        stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

async function postStartServicePrincipalSyncJobCallback(graphCall) {
    const response = await graphCall(params.accessToken, {
        servicePrincipalObjectId: params.scimServicePrincipalObjectId,
        syncJobId: params.servicePrincipalSyncJobId,
    });
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not start the provisioning job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

async function getServicePrincipalSyncJobStatus() {
    const fn =  async () => await graph.getServicePrincipalSyncJobStatus(params.accessToken, {
        servicePrincipalObjectId: params.scimServicePrincipalObjectId,
        syncJobId: params.servicePrincipalSyncJobId,
    });
    const failed = (body) => { throw new Error(`Could not get successful status from provisioning job to sync the service principal!\n${JSON.stringify(body)}`) };
    const hasStatusErred = (status) => status !== 200;
    const hasBodyErred = (body) => {
        const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
        lastExecution && console.log(`Last Execution (${lastExecution.state}) began at ${lastExecution.timeBegan} and ended at ${lastExecution.timeEnded}`);
        lastSuccessfulExecution && console.log(`Last Successful Execution (${lastSuccessfulExecution.state}) began at ${lastSuccessfulExecution.timeBegan} and ended at ${lastSuccessfulExecution.timeEnded}`);
        lastSuccessfulExecutionWithExports && console.log(`Last Successful Execution with Exports (${lastSuccessfulExecutionWithExports.state}) began at ${lastSuccessfulExecutionWithExports.timeBegan} and ended at ${lastSuccessfulExecutionWithExports.timeEnded}`);
        return !(lastSuccessfulExecutionWithExports || lastSuccessfulExecution || (lastExecution && lastExecution.state === 'Succeeded'));
    }
    const keepGettingServicePrincipalSyncJobStatus = keepFetching(fn, failed, hasStatusErred, hasBodyErred);
    await keepGettingServicePrincipalSyncJobStatus(10, '');
}

const callbacks = {
    postAccessToken: postAccessTokenCallback,
    postScimConnectorGalleryApp: postScimConnectorGalleryAppCallback,
    getAadGroups: getAadGroupsCallback,
    getServicePrincipal: getServicePrincipalCallback,
    postAddAadGroupToServicePrincipal: postAddAadGroupToServicePrincipalCallback,
    postCreateServicePrincipalSyncJob: postCreateServicePrincipalSyncJobCallback,
    postValidateServicePrincipalCredentials: postValidateServicePrincipalCredentialsCallback,
    putSaveServicePrincipalCredentials: putSaveServicePrincipalCredentialsCallback,
    postStartServicePrincipalSyncJob: postStartServicePrincipalSyncJobCallback,
};

app.get('/', async (req, res) => {
    try {
        // Gets sign-in code from URL
        const { query: { code } } = url.parse(req.url, true);
        if (!code) {
            throw new Error('Unable to get sign-in code!');
        }
        params.code = code;
        // Notifies user
        res.send('Successfully signed in!');
    } catch(err) {
        res.send(err.message);
    }
    try {
        const userInputs = await getUserInputs();
        params = { ...params, ...userInputs};
        const syncSteps = graph.getSyncSteps();
        stepsStatus = log.initialTable(syncSteps);
        await Promise.mapSeries(syncSteps, ({ key, fn }) => callbacks[key](fn));
        await getServicePrincipalSyncJobStatus();
        log.bold('SYNCING STEPS COMPLETED!');
        console.log(logo.celebrate);
    } catch(err) {
        console.error(err)
    }
    process.exit(0);
});

app.listen(port);
console.log(logo.scimSync);
prompts.quit();
prompts.signin(redirectLoginUrl);