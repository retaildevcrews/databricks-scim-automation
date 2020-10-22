const startCsv = require('./csv');
const startCli = require('./cli');
const { isCsvFile, log, prompts } = require('./helpers');

async function startSync() {
    try {
        if (isCsvFile(process.argv[2])) {
            return startCsv(process.argv[2]);
        }
        log.highlight('Did not pass in path to CSV file with inputs...');
        const shouldContinue = await prompts.userInput('Continue with single sync? (y/n)');
        if (shouldContinue.toLowerCase() === 'y') {
            return startCli();
        }
        prompts.howToQuit();
        const csvInputPath = await prompts.userInput('Enter path to CSV file with inputs');
        return startCsv(csvInputPath);
    } catch (error) {
        console.error(error); // eslint-disable-line no-console
    }
    return true;
}

startSync();
