const fs = require('fs');
const Promise = require('bluebird');
const signin = require('@databricks-scim-automation/signin');
const { getSyncSteps } = require('@databricks-scim-automation/graph');

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

function promisfySyncCall(csvLine) {
    const [scimAppName, aadGroup, databricksUrl, databricksPat] = csvLine.split(',');
    if (!isDatabricksUrl(databricksUrl)) {
        throw new Error(`Databricks URL (${databricksUrl}) is not an accepted value`);
    }
    if (!isDatabricksPat(databricksPat)) {
        throw new Error(`Databricks PAT (${databricksPat}) is not an accepted value`);
    }
    // const params = {}
}

const execCsv = (code) => {
    const csv = getCsv();
    const syncPromises = csv.map(promisfySyncCall);
};

try {
    console.log('Press ^C at any time to quit.');
    console.log("\x1b[1m%s\x1b[0m", 'Click on the following link to sign in: ');
    console.log(signin.redirectLoginUrl);
    signin.startApp(execCsv);
} catch(err) {
    console.error(err);
}