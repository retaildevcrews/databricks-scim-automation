const fs = require('fs');
const Promise = require('bluebird');
const signin = require('@databricks-scim-automation/signin');
const graph = require('@databricks-scim-automation/graph');
const syncCallbacks = require('./syncCallbacks');

const isDatabricksUrl = url => /https://*.azuredatabricks.net*/.test(url);
const isDatabricksPat = pat => /^dapi*/.test(pat);

function getCsv() {
    const csvPath = process.argv[2];
    const fileExists = fs.existsSync(csvPath);
    if (!fileExists) {
        throw new Error('Unable to find file (i.e. npm start <PATH_TO_CSV>)');
    }
    if (!csvPath.endsWith('.csv')) {
        throw new Error('Did not receive a file with a CSV extension');
    }
    const fileContent = fs.readFileSync(csvPath, 'utf8').split("\r\n");
    const isFirstLineHeader = !(isDatabricksUrl(fileContent[0]));
    return isFirstLineHeader ? fileContent.slice(1) : fileContent;
};

async function promisfySyncCall(csvLine, sharedParams) {
    const [galleryAppName, filterAadGroupDisplayName, databricksUrl, databricksPat] = csvLine.split(',');
    if (!isDatabricksUrl(databricksUrl)) {
        throw new Error(`Databricks URL (${databricksUrl}) is not an accepted value`);
    }
    if (!isDatabricksPat(databricksPat)) {
        throw new Error(`Databricks PAT (${databricksPat}) is not an accepted value`);
    }

    let params = {
        ...sharedParams,
        databricksUrl,
        databricksPat,
        filterAadGroupDisplayName,
        galleryAppName,
    };

    return Promise.mapSeries([
        {
            graphCall: graph.postScimConnectorGalleryApp,
            callback: syncCallbacks.postScimConnectorGalleryApp,
        }, {
            graphCall: graph.getAadGroups,
            callback: syncCallbacks.getAadGroups,
        }, {
            graphCall: graph.getServicePrincipal,
            callback: syncCallbacks.keepGettingServicePrincipal(() => graph.getServicePrincipal(params)),
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
            callback: syncCallbacks.keepGettingServicePrincipalSyncJobStatus(() => graph.getServicePrincipalSyncJobStatus(params)),
        },
    ], ({ graphCall, callback }) => (
        graphCall(params)
            .then(callback)
            .then((res) => {
                params = { ...params, ...res.params };
                return new Promise.resolve(res.status);
            })
            .catch(error => new Promise.resolve(error.message))
    ));
}

const execCsv = async (code) => {
    console.log('Processing...');
    try {
        const csv = getCsv();
        const tokens = await graph.postAccessToken({ code, host: signin.host }).then(syncCallbacks.postAccessToken);
        // TODO: Account for required token refreshing with graph.postRefreshAccessToken
        const sharedParams = {
            galleryAppTemplateId: '9c9818d2-2900-49e8-8ba4-22688be7c675',
            syncJobTemplateId: 'dataBricks',
            ...tokens
        };
        const syncAllStatus = await Promise.all(csv.map((csvLine) => promisfySyncCall(csvLine, sharedParams)));
        console.log('Complete...');
        console.log(syncAllStatus);
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