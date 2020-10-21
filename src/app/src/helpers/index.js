const fs = require('fs');
const log = require('./log');
const prompts = require('./prompts');

const isDatabricksUrl = (url) => /https:\/\/.*\.azuredatabricks.net\/?/.test(url);
const isValidInput = (param) => /\S/.test(param);

function isCsvFile(path) {
    const fileExists = fs.existsSync(path);
    return fileExists && path.endsWith('.csv');
}

function getCsvInputs(path) {
    const fileContent = fs.readFileSync(path, 'utf8').split('\r\n');
    const isFirstLineHeader = !(isDatabricksUrl(fileContent[0]));
    return {
        csvPath: path,
        csvHeader: isFirstLineHeader ? fileContent[0] : undefined,
        csvRows: isFirstLineHeader ? fileContent.slice(1) : fileContent,
    };
}

function createFile(outputDir, inputPath, initialContent) {
    const outputDirExists = fs.existsSync(outputDir);
    if (!outputDirExists) {
        fs.mkdirSync(outputDir);
    }
    const outputPath = `${outputDir}/${inputPath.split('/')[inputPath.split('/').length - 1]}`;
    const fileExists = fs.existsSync(outputPath);
    if (!fileExists) {
        fs.writeFileSync(outputPath, initialContent);
    }
    return outputPath;
}

async function handleResponseErrors(response, successCode) {
    if (response.status === 204) {
        return response;
    }
    const body = await response.json();
    if (response.status !== successCode) {
        throw new Error(`FAILED> ${response.statusText} (${response.status}): ${JSON.stringify(body).split(',').join('/')}`);
    }
    return body;
}

const boolNoop = (bool) => () => bool;
const delay = (time) => new Promise((done) => setTimeout(() => done(), time));
const keepFetching = (args) => async (retries, response) => {
    if (retries === 0) {
        return args.failedCallback(response);
    }
    // Default param values
    const { waitTime = 5000, hasStatusErred = boolNoop(false), hasBodyErred = boolNoop(false) } = args;
    // Delay before executing function
    await delay(waitTime);
    return args.fn().then(async (res) => {
        if (hasStatusErred(res.status)) {
            return keepFetching(args)(retries - 1, res);
        }
        const body = await res.clone().json();
        if (hasBodyErred(body)) {
            return keepFetching(args)(retries - 1, res);
        }
        return res;
    });
};

module.exports = {
    createFile,
    handleResponseErrors,
    isCsvFile,
    isDatabricksUrl,
    isValidInput,
    log,
    getCsvInputs,
    keepFetching,
    prompts,
};
