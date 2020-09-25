require('dotenv').config();
const Promise = require('bluebird');
const fs = require('fs');
const signin = require('@databricks-scim-automation/signin');
const graph = require('@databricks-scim-automation/graph');
const { getKeyvaultSecrets } = require('../services/keyvault');
const syncCallbacks = require('./syncCallbacks');
const { keyvaultSettings, tokenSettings } = require('../../config');
const {
    isDatabricksUrl,
    isCsvFile,
    getCsvInputs,
    createFile,
    prompts,
} = require('../helpers');

const graphCalls = [
    {
        graphCall: graph.postScimConnectorGalleryApp,
        callback: syncCallbacks.postScimConnectorGalleryApp,
    }, {
        graphCall: graph.getAadGroups,
        callback: syncCallbacks.getAadGroups,
    }, {
        graphCall: graph.getServicePrincipal,
        callback: syncCallbacks.keepGettingServicePrincipal,
    }, {
        graphCall: graph.postAddAadGroupToServicePrincipal,
        callback: syncCallbacks.postAddAadGroupToServicePrincipal,
    }, {
        graphCall: graph.postCreateServicePrincipalSyncJob,
        callback: syncCallbacks.postCreateServicePrincipalSyncJob,
    }, {
        graphCall: graph.postCreateDatabricksPat,
        callback: syncCallbacks.postCreateDatabricksPat,
    }, {
        graphCall: graph.postValidateServicePrincipalCredentials,
        callback: syncCallbacks.postValidateServicePrincipalCredentials,
    }, {
        graphCall: graph.putSaveServicePrincipalCredentials,
        callback: syncCallbacks.putSaveServicePrincipalCredentials,
    }, {
        graphCall: graph.postStartServicePrincipalSyncJob,
        callback: syncCallbacks.postStartServicePrincipalSyncJob,
    }, {
        graphCall: graph.getServicePrincipalSyncJobStatus,
        callback: syncCallbacks.keepGettingServicePrincipalSyncJobStatus,
    },
]

async function promisfySyncCall(csvLine, sharedParams) {
    const [galleryAppName, filterAadGroupDisplayName, databricksUrl] = csvLine.split(',');
    if (!isDatabricksUrl(databricksUrl)) {
        throw new Error(`Databricks URL (${databricksUrl}) is not an accepted value`);
    }

    let params = {
        hasFailed: false,
        ...sharedParams,
        databricksUrl,
        filterAadGroupDisplayName,
        galleryAppName,
    };

    return Promise.mapSeries(graphCalls, ({ graphCall, callback }) => {
        if (params.hasFailed) {
            return new Promise.resolve('n/a');
        }
        return graphCall(params)
            .then(async (res) => await callback(res, params))
            .then((res) => {
                params = { ...params, ...res.params };
                return new Promise.resolve(res.status);
            })
            .catch(error => {
                params = { ...params, hasFailed: true };
                return new Promise.resolve(error.message)
            })
    });
}

const startSync = async (
    secrets,
    { csvPath, csvHeader, csvRows },
    { graphAuthCode, databricksAuthCode }
) => {
    try {
        console.log('Creating access tokens...');
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

        // TODO: Account for required token refreshing with graph.postRefreshAccessToken

        const sharedParams = {
            galleryAppTemplateId: process.env.GALLERY_APP_TEMPLATE_ID,
            syncJobTemplateId: process.env.SCIM_TEMPLATE_ID,
            graphAccessToken: graphTokens.accessToken,
            graphRefreshAccessToken: graphTokens.refreshToken,
            databricksAccessToken: databricksTokens.accessToken,
            databricksRefreshAccessToken: databricksTokens.refreshToken
        };

        console.log('Create SCIM connector apps and running sync jobs...');
        const syncAllStatus = await Promise.all(csvRows.map((line) => promisfySyncCall(line, sharedParams)));

        console.log('Creating output file...');
        const initialOutputContent = `Execution Date (UTC),${csvHeader},${graphCalls.map(({ graphCall }) => graphCall.name).join(',')}`;
        const csvOutputPath = createFile('./outputs', csvPath, initialOutputContent);
        for (let i = 0; i < syncAllStatus.length; i++) {
            fs.appendFileSync(csvOutputPath, `\r\n${new Date()},${csvRows[i]},${syncAllStatus[i].join(',')}`);
        }

        console.log('Complete...');
    } catch(error) {
        console.log('Erred...');
        console.error({ error });
    }
    process.exit(0);
};

async function startCsv(csvInputPath = process.argv[2]) {
    try {
        console.log('Checking input file...');
        if (!isCsvFile(csvInputPath)) {
            throw new Error('Unable to find csv file (i.e. npm start <PATH_TO_CSV>)');
        }
        const csvInput = getCsvInputs(csvInputPath);
        console.log('Getting key vault secrets...');
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
            }) => ({ tenantId, clientId, clientSecret }));
        // set up express app to get authentication code
        let graphAuthCode, databricksAuthCode;
        const signinApp = new signin.SigninApp();
        signinApp.setCallback((graphCode) => {
            graphAuthCode = graphCode;
            prompts.howToSignin(signin.redirectLoginUrl(secrets));
            signinApp.setCallback((databricksCode) => {
                databricksAuthCode = databricksCode;
                startSync(secrets, csvInput, { graphAuthCode, databricksAuthCode });
            })
        })
        signinApp.start();
        prompts.howToQuit();
        prompts.howToSignin(signin.redirectLoginUrl(secrets));
    } catch(err) {
        console.error(err);
    }
}

module.exports = startCsv;