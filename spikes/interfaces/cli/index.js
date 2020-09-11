require('dotenv').config();
const express = require('express');
const url = require('url');
const Promise = require('bluebird');
const graph = require('@databricks-scim-automation/graph');
const ascii = require('./ascii');
const prompts = require('./prompts');
const log = require('./log');
const { keepFetching } = require('./helpers');

const port = process.env.PORT || 8000;
const host = `localhost:${port}`;
const redirectLoginUrl = graph.getRedirectLoginUrl({ host });
const app = express();

// Holds values required for Microsoft Graph API calls
let params = { host };
// Keeps track of each sync process step
let stepsStatus = [];

// Checks if created valid access and refresh tokens by redeeming sign-in code
async function postAccessTokenCallback(response) {
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
async function postScimConnectorGalleryAppCallback(response) {
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
async function getAadGroupsCallback(response) {
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
async function getServicePrincipalCallback(response, graphCall) {
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
    if (hasStatusErred(response.status) || hasBodyError(body)) {
        body = await keepGettingServicePrincipal(4, '');
    }
    params.appRoleId = body.appRoles.filter(({ isEnabled, origin, displayName }) => (
        isEnabled && origin === 'Application' && displayName === 'User'
    ))[0].id;
    stepsStatus = log.table(stepsStatus, { Action: 'getServicePrincipal', Status: 'Success', Attempts: attempts });
    return Promise.resolve({ appRoleId: params.appRoleId });
}

// Checks if successfully added AAD group to service principal
async function postAddAadGroupToServicePrincipalCallback(response) {
    const body = await response.json();
    if (response.status !== 201) {
        stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Failed', Attempts: 1 });
        throw new Error(`Could not add AAD group to the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postAddAadGroupToServicePrincipal', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully provisioned a sync job
async function postCreateServicePrincipalSyncJobCallback(response) {
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
async function postValidateServicePrincipalCredentialsCallback(response) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postValidateServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully saved credentials to connect with databricks workspace
async function putSaveServicePrincipalCredentialsCallback(response) {
    if (response.status !== 204){
        stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not validate a connection with the third-party application!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'putSaveServicePrincipalCredentials', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Checks if successfully started sync job
async function postStartServicePrincipalSyncJobCallback(response) {
    if (response.status !== 204) {
        stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Failed', Attempts: 1 });
        const body = await response.json();
        throw new Error(`Could not start the provisioned job to sync the service principal!\n${JSON.stringify(body)}`);
    }
    stepsStatus = log.table(stepsStatus, { Action: 'postStartServicePrincipalSyncJob', Status: 'Success', Attempts: 1 });
    return Promise.resolve({});
}

// Outputs sync job status until successful or hits max number of attempts
async function getServicePrincipalSyncJobStatus() {
    const fn =  async () => await graph.getServicePrincipalSyncJobStatus(params);
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

// Callbacks passed into the graph.getSyncSteps() functions
const callbackPromises = {
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
        if (!code) { throw new Error('Unable to get sign-in code!') }
        // Saves code
        params.code = code;
        // Notifies user
        res.send('Successfully signed in!');
    } catch(err) {
        res.send(err.message);
    }
    try {
        // Required User Inputs and Default Values
        const inputPrompts = [
            { message: 'SCIM connector gallery app template ID', key: 'galleryAppTemplateId', defaultInput: '9c9818d2-2900-49e8-8ba4-22688be7c675' },
            { message: 'SCIM connector gallery app display name', key: 'galleryAppName', defaultInput: undefined },
            { message: 'filter AAD group by display name', key: 'filterAadGroupDisplayName', defaultInput: 'Databricks-SCIM' },
            { message: 'sync job template ID', key: 'syncJobTemplateId', defaultInput: 'dataBricks' },
            { message: `databricks workspace URL`, key: 'databricksUrl', defaultInput: process.env.DATABRICKS_URL },
            { message: `databricks workspace PAT`, key: 'databricksPat', defaultInput: process.env.DATABRICKS_PAT },
        ];
        // Prompt user for inputs
        const userInputs = await prompts.getUserInputs(inputPrompts);
        // Save user inputs
        params = { ...params, ...userInputs};
        // Get steps required to sync databricks workspace with aad groups
        const syncSteps = graph.getSyncSteps();
        // Print initial sync status
        stepsStatus = log.initialTable(syncSteps);
        // Execute the sync steps
        await Promise.mapSeries(syncSteps, ({ key, fn }) => fn(params, callbackPromises[key]));
        // Log the sync job statuses
        await getServicePrincipalSyncJobStatus();
        // Completed sync steps
        log.bold('SYNCING STEPS COMPLETED!');
        console.log(ascii.celebrate);
    } catch(err) {
        console.error(err)
    }
    process.exit(0);
});

app.listen(port);
console.log(ascii.scimSync);
// Instruct user how to quit
prompts.quit();
prompts.signin(redirectLoginUrl);
