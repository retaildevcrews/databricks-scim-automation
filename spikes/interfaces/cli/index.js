require('dotenv').config();
const Promise = require('bluebird');
const graph = require('@databricks-scim-automation/graph');
const signin = require('@databricks-scim-automation/signin');
const callbacks = require('./callbacks');
const { keepFetching } = require('./helpers');
const ascii = require('./ascii');
const prompts = require('./prompts');
const log = require('./log');

// Holds values required for Microsoft Graph API calls
let params = { host: signin.host };
// Keeps track of each sync process step
let stepsStatus = [];

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

async function execInputs(code) {
    try {
        params.code = code;
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
        const syncSteps = [
            graph.postAccessToken,
            graph.postScimConnectorGalleryApp,
            graph.getAadGroups,
            graph.getServicePrincipal,
            graph.postAddAadGroupToServicePrincipal,
            graph.postCreateServicePrincipalSyncJob,
            graph.postValidateServicePrincipalCredentials,
            graph.putSaveServicePrincipalCredentials,
            graph.postStartServicePrincipalSyncJob,
        ];
        // Print initial sync status
        stepsStatus = log.initialTable(syncSteps.map(step => step.name));
        // Execute the sync steps
        await Promise.mapSeries(syncSteps, (step) => step(params).then(response => {
            console.log('stepName', step.name);
            console.log(callbacks);
            return callbacks[step.name](response, stepsStatus, params, step);
        }));
        // Log the sync job statuses
        await getServicePrincipalSyncJobStatus();
        // Completed sync steps
        log.bold('SYNCING STEPS COMPLETED!');
        console.log(ascii.celebrate);
    } catch(err) {
        console.error(err)
    }
    process.exit(0);
}

signin.startApp(execInputs);
console.log(ascii.scimSync);
// Instruct user how to quit
prompts.quit();
prompts.signin(signin.redirectLoginUrl);