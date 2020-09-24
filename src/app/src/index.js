require('dotenv').config();
const fs = require('fs');
const Promise = require('bluebird');
const signin = require('@databricks-scim-automation/signin');
const graph = require('@databricks-scim-automation/graph');
const keyvaultService = require('./keyvaultService');
const syncCallbacks = require('./syncCallbacks');
var graphTokens = '';
var databricksTokens = '';

const isDatabricksUrl = url => /https:\/\/.*\.azuredatabricks.net\/?/.test(url);

function getCsvInputs(path) {
    const fileExists = fs.existsSync(path);
    if (!fileExists) {
        throw new Error('Unable to find file (i.e. npm start <PATH_TO_CSV>)');
    }
    if (!path.endsWith('.csv')) {
        throw new Error('Did not receive a file with a CSV extension');
    }
    const fileContent = fs.readFileSync(path, 'utf8').split("\r\n");
    const isFirstLineHeader = !(isDatabricksUrl(fileContent[0]));
    return {
        csvPath: path,
        csvHeader: isFirstLineHeader ? fileContent[0] : undefined,
        csvRows: isFirstLineHeader ? fileContent.slice(1) : fileContent,
    };
}

async function getKeyvaultSecrets() {
    const keyvault = new keyvaultService(process.env.KEYVAULT_URL, 'CLI');
    await keyvault.connect();
    const tenantId = await keyvault.getSecret('TenantID');
    const clientId = await keyvault.getSecret('AppClientID');
    const clientSecret = await keyvault.getSecret('AppClientSecret');
    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Missing Key Vault Secrets (tenantId, clientId, clientSecret)');
    }
    return { tenantId, clientId, clientSecret };
}

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
        databricksUrl: databricksUrl.endsWith('/') ? databricksUrl : databricksUrl + '/',
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

function createFile(outputDir, inputPath, initialContent) {
    const outputDirExists = fs.existsSync(outputDir);
    if (!outputDirExists) {
        fs.mkdirSync(outputDir);
    }
    const outputPath = outputDir + '/' + inputPath.split('/')[inputPath.split('/').length - 1];
    const fileExists = fs.existsSync(outputPath);
    if (!fileExists) {
        fs.writeFileSync(outputPath, initialContent);
    }
    return outputPath;
}

const startSync = (secrets, { csvPath, csvHeader, csvRows }) => async (code) => {
    console.log('Processing...');
    try {
        const { tenantId, clientId, clientSecret } = secrets;
        const tokens = await graph.postAccessToken({
            code,
            host: signin.host,
            tenantId,
            clientId,
            clientSecret,
        }).then(syncCallbacks.postAccessToken);
        // const tokens = await graph.postAccessToken({ code, host: signin.host }).then(syncCallbacks.postAccessToken);
        // const databricksTokens = await graph.postDatabricksAccessToken({ code, host: signin.host }).then(syncCallbacks.postDatabricksAccessToken);
        // TODO: Account for required token refreshing with graph.postRefreshAccessToken

        const sharedParams = {
            galleryAppTemplateId: process.env.GALLERY_APP_TEMPLATE_ID,
            syncJobTemplateId: process.env.SCIM_TEMPLATE_ID,
            ...graphTokens,
            ...databricksTokens
        };
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

async function main() {
    try {
        console.log('Checking input file...');
        const csvInputPath = process.argv[2];
        const csvInput = getCsvInputs(csvInputPath);
        console.log('Getting key vault secrets...');
        const secrets = await getKeyvaultSecrets();
        console.log('Press ^C at any time to quit.');
        console.log("\x1b[1m%s\x1b[0m", 'Click on the following link to sign in: ');
        console.log(signin.redirectLoginUrl(secrets));
        signin.startApp(startSync(secrets, csvInput));
    } catch(err) {
        console.error(err);
    }
}

main();
