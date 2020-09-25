function bold(message) {
    console.log("\x1b[1m%s\x1b[0m", message);
}

function boldFormat(message) {
    return `\x1b[1m${message}\x1b[0m`;
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
    initialTable,
    table,
};