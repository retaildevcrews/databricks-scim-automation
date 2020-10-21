const readline = require('readline');
const log = require('./log');
const { loginTypes } = require('../../config');

const isValidInput = (param) => /\S/.test(param);

function howToQuit() {
    log.highlight('Press ^C at any time to quit.');
}

function howToSignin(loginType = loginTypes.GRAPH_LOGIN, url) {
    log.bold(`\nClick on the following link to sign in and retrieve ${loginType}: `);
    console.log(url); // eslint-disable-line no-console
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function userInput(message, aggInputs, defaultInput) {
    const prompt = defaultInput ? `${log.boldFormat(message)}: (${defaultInput}) ` : `${log.boldFormat(message)}: `;
    return new Promise((resolve) => rl.question(prompt, (input) => {
        const answer = input || defaultInput;
        // Enforce unique user emails for owners
        if (answer && aggInputs && aggInputs.ownerEmail1 && answer.trim().toLowerCase() === aggInputs.ownerEmail1.trim().toLowerCase()) {
            return resolve(userInput(`${message}!`, aggInputs));
        }
        if (answer && isValidInput(answer)) {
            return resolve(answer.trim());
        }
        return resolve(userInput(`${message}!`, aggInputs));
    }));
}

function closeUserInput() {
    rl.close();
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
        const newInputs = await inputPrompts.reduce(async (inputs, { message, key, defaultInput }) => {
            const aggInputs = await inputs;
            const currInput = await userInput(message, aggInputs, defaultInput).catch((err) => { throw new Error(err); });
            return { ...aggInputs, [key]: (key === 'databricksUrl') ? currInput.toLowerCase() : currInput };
        }, {});
        closeUserInput();
        return newInputs;
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
        process.exit(0);
    }
    return true;
}

module.exports = {
    howToQuit,
    howToSignin,
    userInput,
    getUserInputs,
    closeUserInput,
};
