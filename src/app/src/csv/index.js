require('dotenv').config();
const Promise = require('bluebird');
const fs = require('fs');
const cliProgress = require('cli-progress');
const signin = require('@databricks-scim-automation/signin');
const graph = require('@databricks-scim-automation/graph');
const jwtDecode = require('jwt-decode');
const { loginTypes } = require('../../config');
const { getKeyvaultSecrets } = require('../services/keyvault');
const syncCallbacks = require('./syncCallbacks');
const { keyvaultSettings, tokenSettings } = require('../../config');
const {
    isDatabricksUrl,
    isValidInput,
    isCsvFile,
    getCsvInputs,
    createFile,
    prompts,
    log,
} = require('../helpers');

const csvErroredLines = []; 
let csvLineCount = 0;
const validationMessage = '\n\nCSV Data Validation Failed due one of the following reasons:\n1. DatabricksURL is not an accepted value\n2. One or more values are empty\n3. Same user email is listed for SCIM APP Onwer1 and SCIM APP Owner2';
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
        graphCall: graph.getUserForOwner1,
        callback: syncCallbacks.getUserForOwner1,
    }, {
        graphCall: graph.postAddSPOwner1,
        callback: syncCallbacks.postAddSPOwner1,
    }, {
        graphCall: graph.postAddAppOwner1,
        callback: syncCallbacks.postAddAppOwner1,
    }, {
        graphCall: graph.getUserForOwner2,
        callback: syncCallbacks.getUserForOwner2,
    }, {
        graphCall: graph.postAddSPOwner2,
        callback: syncCallbacks.postAddSPOwner2,
    }, {
        graphCall: graph.postAddAppOwner2,
        callback: syncCallbacks.postAddAppOwner2,
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
];

const progressMultiBar = new cliProgress.MultiBar({
    format: '{galleryAppName}: [{bar}] | {percentage}% | {value}/{total} Steps | {duration}s Elapsed',
}, cliProgress.Presets.legacy);

function validateCSVData(csvLine) {
    const [galleryAppName, filterAadGroupDisplayName, ownerEmail1, ownerEmail2, databricksUrl] = csvLine.split(',').map((item, index) => ((index === 4) ? item.trim().toLowerCase() : item.trim()));
    csvLineCount += 1;
    if (!isDatabricksUrl(databricksUrl) || ownerEmail1.toLowerCase() === ownerEmail2.toLowerCase()
    || !isValidInput(galleryAppName) || !isValidInput(filterAadGroupDisplayName) || !isValidInput(ownerEmail1) || !isValidInput(ownerEmail2)) {
        csvErroredLines.push(csvLineCount);
    }
}

async function promisfySyncCall(csvLine, sharedParams) {
    const [galleryAppName, filterAadGroupDisplayName, ownerEmail1, ownerEmail2, databricksUrl] = csvLine.split(',').map((item, index) => ((index === 4) ? item.trim().toLowerCase() : item.trim()));

    if (!isDatabricksUrl(databricksUrl)) {
        throw new Error(`Databricks URL (${databricksUrl}) is not an accepted value`);
    }
    const progressBar = progressMultiBar.create(graphCalls.length, 0, { galleryAppName });

    let params = {
        hasFailed: false,
        progressBar,
        ...sharedParams,
        databricksUrl,
        filterAadGroupDisplayName,
        galleryAppName,
        ownerEmail1,
        ownerEmail2,
    };
    const syncResult = await Promise.mapSeries(graphCalls, ({ graphCall, callback }) => {
        if (params.hasFailed) {
            progressBar.stop();
            return new Promise.resolve('n/a'); // eslint-disable-line new-cap
        }
        return graphCall(params)
            .then((res) => callback(res, params))
            .then((res) => {
                params = { ...params, ...res.params };
                return new Promise.resolve(res.status); // eslint-disable-line new-cap
            })
            .catch((error) => {
                params = { ...params, hasFailed: true };
                return new Promise.resolve(error.message); // eslint-disable-line new-cap
            });
    });
    progressBar.stop();
    return syncResult;
}

const startSync = async (secrets, { csvPath, csvHeader, csvRows }, { graphAuthCode, databricksAuthCode }) => {
    try {
        console.log('\nCreating access tokens...'); // eslint-disable-line no-console
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
            databricksRefreshAccessToken: databricksTokens.refreshToken,
        };
        const decodedGraphAccessToken = jwtDecode(graphTokens.accessToken);
        const executorName = decodedGraphAccessToken.name;
        const executorEmail = decodedGraphAccessToken.unique_name;

        console.log('\n\nValidating CSV Input File...'); // eslint-disable-line no-console
        csvRows.map((line) => validateCSVData(line));
        if (csvErroredLines.length > 0) {
            log.highlight(`${csvErroredLines.length} SCIM app data validation failed for CSV Application Index(es): ${csvErroredLines}`);
            log.highlight(validationMessage);
            throw new Error('CSV Data validation failed...');
        }

        console.log('\nCreating SCIM connector apps and running sync jobs...'); // eslint-disable-line no-console
        const syncAllStatus = await Promise.all(csvRows.map((line) => promisfySyncCall(line, sharedParams)));

        console.log('\n\nCreating output file...'); // eslint-disable-line no-console
        const initialOutputContent = `Execution Date (UTC),Executor Name,Executor Email,${csvHeader},${graphCalls.map(({ graphCall }) => graphCall.name).join(',')}`;
        const csvOutputPath = createFile('./outputs', csvPath, initialOutputContent);
        for (let i = 0; i < syncAllStatus.length; i += 1) {
            fs.appendFileSync(csvOutputPath, `\r\n${new Date()},${executorName},${executorEmail},${csvRows[i]},${syncAllStatus[i].join(',')}`);
        }
        console.log('Complete...'); // eslint-disable-line no-console
    } catch (error) {
        console.log('Erred...'); // eslint-disable-line no-console
        console.error({ error }); // eslint-disable-line no-console
    }
    process.exit(0);
};

async function startCsv(csvInputPath = process.argv[2]) {
    try {
        console.log('Checking input file...'); // eslint-disable-line no-console
        if (!isCsvFile(csvInputPath)) {
            throw new Error('Unable to find csv file (i.e. npm start <PATH_TO_CSV>)');
        }
        const csvInput = getCsvInputs(csvInputPath);
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
            }) => ({ tenantId, clientId, clientSecret }));
        // set up express app to get authentication code
        let graphAuthCode;
        let databricksAuthCode;
        const signinApp = new signin.SigninApp();
        signinApp.setCallback((graphCode) => {
            graphAuthCode = graphCode;
            prompts.howToSignin(loginTypes.DATABRICKS_LOGIN, signin.redirectLoginUrl(secrets));
            signinApp.setCallback((databricksCode) => {
                databricksAuthCode = databricksCode;
                startSync(secrets, csvInput, { graphAuthCode, databricksAuthCode });
            });
        });
        signinApp.start();
        prompts.howToQuit();
        prompts.howToSignin(loginTypes.GRAPH_LOGIN, signin.redirectLoginUrl(secrets));
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
    }
}

module.exports = startCsv;
