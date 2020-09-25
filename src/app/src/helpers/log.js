const format = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    yellow: '\x1b[33m',
};

function boldFormat(message) {
    return `${format.bold}${message}${format.reset}`;
}

function bold(message) {
    console.log(boldFormat(message));
}

function highlight(message) {
    return console.log(`${format.yellow}${boldFormat(message)}`);
}

function initialTable(syncSteps) {
    const tableSteps = syncSteps.map(step => ({ Action: step, Status: 'Waiting...', Attempts: 0 }));
    console.clear();
    console.table(tableSteps);
    return tableSteps;
}

function table(currentSteps, updatedStep) {
    const stepIndex = currentSteps.findIndex(({ Action }) => Action === updatedStep.Action);
    currentSteps[stepIndex] = updatedStep;
    console.clear();
    console.table(currentSteps);
    return currentSteps;
}

module.exports = {
    bold,
    boldFormat,
    highlight,
    initialTable,
    table,
};