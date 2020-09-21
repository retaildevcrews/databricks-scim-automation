require('dotenv').config();
const fs = require('fs');
const Promise = require('bluebird');
const signin = require('@databricks-scim-automation/signin');
const graph = require('@databricks-scim-automation/graph');
const syncCallbacks = require('./syncCallbacks');

const isDatabricksUrl = url => /https://*.azuredatabricks.net*/.test(url);
const isDatabricksPat = pat => /^dapi*/.test(pat);

function getCsv(csvPath) {
    const fileExists = fs.existsSync(csvPath);
    if (!fileExists) {
        throw new Error('Unable to find file (i.e. npm start <PATH_TO_CSV>)');
    }
    if (!csvPath.endsWith('.csv')) {
        throw new Error('Did not receive a file with a CSV extension');
    }
    const fileContent = fs.readFileSync(csvPath, 'utf8').split("\r\n");
    const isFirstLineHeader = !(isDatabricksUrl(fileContent[0]));
    return {
        csvHeader: isFirstLineHeader ? fileContent[0] : undefined,
        csvInput: isFirstLineHeader ? fileContent.slice(1) : fileContent,
    };
};

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
    const [galleryAppName, filterAadGroupDisplayName, databricksUrl, databricksPat] = csvLine.split(',');
    if (!isDatabricksUrl(databricksUrl)) {
        throw new Error(`Databricks URL (${databricksUrl}) is not an accepted value`);
    }
    if (!isDatabricksPat(databricksPat)) {
        throw new Error(`Databricks PAT (${databricksPat}) is not an accepted value`);
    }

    let params = {
        hasFailed: false,
        ...sharedParams,
        databricksUrl,
        databricksPat,
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

const execCsv = async (code) => {
    console.log('Processing...');
    try {
        const csvInputPath = process.argv[2];
        const tokens = await graph.postAccessToken({ code, host: signin.host }).then(syncCallbacks.postAccessToken);
        // TODO: Account for required token refreshing with graph.postRefreshAccessToken

        const sharedParams = {
            galleryAppTemplateId: process.env.GALLERY_APP_TEMPLATE_ID,
            syncJobTemplateId: process.env.SCIM_TEMPLATE_ID,
            ...tokens
        };
        const { csvHeader, csvInput } = getCsv(csvInputPath);
        const syncAllStatus = await Promise.all(csvInput.map((csvLine) => promisfySyncCall(csvLine, sharedParams)));

        console.log('Creating output file...');
        const initialOutputContent = `Execution Date (UTC),${csvHeader},${graphCalls.map(({ graphCall }) => graphCall.name).join(',')}`;
        const csvOutputPath = createFile('./outputs', csvInputPath, initialOutputContent);
        for (let i = 0; i < syncAllStatus.length; i++) {
            fs.appendFileSync(csvOutputPath, `\r\n${new Date()},${csvInput[i]},${syncAllStatus[i].join(',')}`);
        }

        console.log('Complete...');
    } catch(error) {
        console.log('Erred...');
        console.error({ error });
    }
    process.exit(0);
};

try {
    console.log('Press ^C at any time to quit.');
    console.log("\x1b[1m%s\x1b[0m", 'Click on the following link to sign in: ');
    console.log(signin.redirectLoginUrl);
    signin.startApp(execCsv);
} catch(err) {
    console.error(err);
}
