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

/**
 * Prompts user in the console and waits for an answer
 * A default value can be provided and excuted with the enter key
 * @param {Array<{message: string, key: string, defaultInput: string|null}>} inputPrompts 
 * @return {Object<key: string>}
 */
async function getUserInputs(inputPrompts) {
    try {
        // Get required inputs from user
        const newInputs = await inputPrompts.reduce(async (inputs, { message, key, defaultInput}) => {
            const aggInputs = await inputs;
            const currInput = await userInput(message, defaultInput).catch(err => { throw new Error(err) });
            return { ...aggInputs, [key]: currInput };  
        }, {});
        closeUserInput();
        return newInputs;

    } catch(err) {
        console.error(err);
        process.exit(0);
    }
}

function closeUserInput() {
    rl.close();
}

module.exports = {
    quit,
    signin,
    userInput,
    getUserInputs,
    closeUserInput,
};