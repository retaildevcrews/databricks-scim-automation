function bold(message) {
    console.log("\x1b[1m%s\x1b[0m", message);
}

function boldFormat(message) {
    return `\x1b[1m${message}\x1b[0m`;
}

module.exports = {
    bold,
    boldFormat,
};