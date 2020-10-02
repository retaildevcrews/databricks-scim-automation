require('dotenv').config();
const Promise = require('bluebird');
const graph = require('@databricks-scim-automation/graph');
const signin = require('@databricks-scim-automation/signin');
const { keyvaultSettings, tokenSettings } = require('../../config');
const { getKeyvaultSecrets } = require('../services/keyvault');
const syncCallbacks = require('./syncCallbacks');
const {
    isDatabricksUrl,
    keepFetching,
    log,
    prompts,
} = require('../helpers');
const ascii = require('./ascii');

// Holds values required for Microsoft Graph API calls
let params = { host: signin.host };
// Keeps track of each sync process step
let stepsStatus = [];

async function startSync(secrets, { graphAuthCode, databricksAuthCode }) {
    try {
        console.log('Creating access tokens...'); // eslint-disable-line no-console
        const graphTokens = await graph.postAccessToken({
            ...secrets,
            host: signin.host,
            code: graphAuthCode,
            scope: tokenSettings.GRAPH_SCOPE,
        }).then(syncCallbacks.postAccessToken);

        const databricksTokens = await graph.postAccessToken({
            ...secrets,
            host: signin.host,
            code: databricksAuthCode,
            scope: tokenSettings.DATABRICKS_SCOPE,
        }).then(syncCallbacks.postAccessToken);

        // Required User Inputs and Default Values
        const inputPrompts = [
            { message: 'SCIM connector gallery app template ID', key: 'galleryAppTemplateId', defaultInput: '9c9818d2-2900-49e8-8ba4-22688be7c675' },
            { message: 'SCIM connector gallery app display name', key: 'galleryAppName', defaultInput: undefined },
            { message: 'filter AAD group by display name', key: 'filterAadGroupDisplayName', defaultInput: undefined },
            { message: 'sync job template ID', key: 'syncJobTemplateId', defaultInput: 'dataBricks' },
            { message: 'databricks workspace URL (Format: https://adb-*.*.azuredatabricks.net)', key: 'databricksUrl', defaultInput: undefined },
        ];
        // Prompt user for inputs
        const userInputs = await prompts.getUserInputs(inputPrompts);
        // Check input fir Databricks URL
        if (!isDatabricksUrl(userInputs.databricksUrl)) {
            throw new Error('Databricks URL needs to be formatted as https://adb-*.*.axuredatabricks.net');
        }
        // Save user inputs
        params = {
            ...params,
            ...secrets,
            ...userInputs,
            graphAccessToken: graphTokens.accessToken,
            graphRefreshAccessToken: graphTokens.refreshToken,
            databricksAccessToken: databricksTokens.accessToken,
            databricksRefreshAccessToken: databricksTokens.refreshToken,
        };
        const syncSteps = [
            graph.postScimConnectorGalleryApp,
            graph.getAadGroups,
            graph.getServicePrincipal,
            graph.postAddAadGroupToServicePrincipal,
            graph.postCreateServicePrincipalSyncJob,
            graph.postCreateDatabricksPat,
            graph.postValidateServicePrincipalCredentials,
            graph.putSaveServicePrincipalCredentials,
            graph.postStartServicePrincipalSyncJob,
        ];
        // Print initial sync status
        stepsStatus = log.initialTable(syncSteps.map((step) => step.name));
        // Execute the sync steps
        await Promise.mapSeries(syncSteps, (step) => step(params).then((response) => (
            syncCallbacks[step.name](response, stepsStatus, params, step)
        )));
        // Log the sync job statuses
        await graph.getServicePrincipalSyncJobStatus(params)
            .then((response) => {
                const fn = () => graph.getServicePrincipalSyncJobStatus(params);
                const failedCallback = (body) => { throw new Error(`Could not get successful status from provisioning job to sync the service principal!\n${JSON.stringify(body)}`); };
                const hasStatusErred = (status) => status !== 200;
                const hasBodyErred = (body) => {
                    const { lastExecution, lastSuccessfulExecution, lastSuccessfulExecutionWithExports } = body.status;
                    lastExecution && console.log(`Last Execution (${lastExecution.state}) began at ${lastExecution.timeBegan} and ended at ${lastExecution.timeEnded}`); // eslint-disable-line no-unused-expressions, no-console
                    lastSuccessfulExecution && console.log(`Last Successful Execution (${lastSuccessfulExecution.state}) began at ${lastSuccessfulExecution.timeBegan} and ended at ${lastSuccessfulExecution.timeEnded}`); // eslint-disable-line no-unused-expressions, no-console
                    lastSuccessfulExecutionWithExports && console.log(`Last Successful Execution with Exports (${lastSuccessfulExecutionWithExports.state}) began at ${lastSuccessfulExecutionWithExports.timeBegan} and ended at ${lastSuccessfulExecutionWithExports.timeEnded}`); // eslint-disable-line no-unused-expressions, no-console
                    return !(lastSuccessfulExecutionWithExports || lastSuccessfulExecution || (lastExecution && lastExecution.state === 'Succeeded'));
                };
                return keepFetching({
                    fn, failedCallback, hasStatusErred, hasBodyErred,
                })(10, response);
            });
        // Completed sync steps
        log.bold('SYNCING STEPS COMPLETED!');
        console.log(ascii.celebrate); // eslint-disable-line no-console
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
    }
    process.exit(0);
}

async function startCli() {
    console.log('Getting key vault secrets...'); // eslint-disable-line no-console
    const keys = [
        keyvaultSettings.TENANT_ID_KEY,
        keyvaultSettings.CLIENT_ID_KEY,
        keyvaultSettings.CLIENT_SECRET_KEY,
    ];
    const secrets = await getKeyvaultSecrets(process.env.KEYVAULT_URL, keys)
        .then(({
            [keyvaultSettings.TENANT_ID_KEY]: tenantId,
            [keyvaultSettings.CLIENT_ID_KEY]: clientId,
            [keyvaultSettings.CLIENT_SECRET_KEY]: clientSecret,
        }) => ({ tenantId, clientId, clientSecret }))
        .catch((error) => {
            throw error;
        });
    // set up express app to get authentication code
    let graphAuthCode;
    let databricksAuthCode;
    const signinApp = new signin.SigninApp();
    signinApp.setCallback((graphCode) => {
        graphAuthCode = graphCode;
        prompts.howToSignin(signin.redirectLoginUrl(secrets));
        signinApp.setCallback((databricksCode) => {
            databricksAuthCode = databricksCode;
            startSync(secrets, { graphAuthCode, databricksAuthCode });
        });
    });
    signinApp.start();
    console.log(ascii.scimSync); // eslint-disable-line no-console
    // Instruct user how to quit
    prompts.howToQuit();
    prompts.howToSignin(signin.redirectLoginUrl(secrets));
}

module.exports = startCli;
