const readline = require('readline');
const log = require('./log');

function quit() {
    console.log("Press ^C at any time to quit.");
}

function signin(url) {
    log.bold('Click on the following link to sign in: ');
    console.log(url);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function userInput(message, defaultInput) {
    const prompt = defaultInput ? `${log.boldFormat(message)}: (${defaultInput}) ` : `${log.boldFormat(message)}: `;
    return new Promise((resolve, reject) => rl.question(prompt, input => {
        const answer = input || defaultInput;
        answer ? resolve(answer) : reject(`Requires user input for ${message}!`);
    }));

}

function closeUserInput() {
    rl.close();
}

module.exports = {
    quit,
    signin,
    userInput,
    closeUserInput,
};