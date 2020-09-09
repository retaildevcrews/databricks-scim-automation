require('dotenv').config();
const express = require('express');
const url = require('url');
const graph = require('@databricks-scim-automation/graph');
const logo = require('./logo');
const prompts = require('./prompts');
const checks = require('./checks');

const port = process.env.PORT || 8000;
const host = `localhost:${port}`;
const redirectLoginUrl = graph.getRedirectLoginUrl({ host });
const app = express();

let userInputs = {};

async function promptSyncFlow() {
// Required User Inputs and Default Values
const inputPrompts = [
    { message: 'SCIM connector gallery app template ID', key: 'scimConnectorGalleryAppTemplateId', defaultInput: '9c9818d2-2900-49e8-8ba4-22688be7c675' },
    { message: 'SCIM connector gallery app display name', key: 'scimConnectorGalleryAppName', defaultInput: undefined },
    { message: 'filter AAD group by display name', key: 'aadGroupFilterDisplayName', defaultInput: 'Databricks-SCIM' },
    { message: 'sync job template ID', key: 'syncJobTemplateId', defaultInput: 'dataBricks' },
    { message: `databricks workspace URL`, key: 'databricksWorkspaceUrl', defaultInput: process.env.DATABRICKS_URL },
    { message: `databricks workspace PAT`, key: 'databricksWorkspacePat', defaultInput: process.env.DATABRICKS_PAT },
];
    try {
        // Get required inputs from user
        const newInputs = await inputPrompts.reduce(async (inputs, { message, key, defaultInput}) => {
            const aggInputs = await inputs;
            const currInput = await prompts.userInput(message, defaultInput).catch(err => { throw new Error(err) });
            return { ...aggInputs, [key]: currInput };  
        }, {});
        userInputs = { ...userInputs, ...newInputs };
        prompts.closeUserInput();

        // Start the sync process
        const syncStatus = await graph.startSyncProcess(userInputs);
        console.log(syncStatus);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}

app.get('/', async (req, res) => {
    try {
        // Gets sign-in code from URL
        const { query: { code } } = url.parse(req.url, true);
        checks.signinCode(code);

        // Creates access and refresh token by redeeming sign-in code
        const response = await graph.postAccessToken(code, { host });
        checks.postAccessToken(response.status);
        const body = await response.json();
        userInputs.accessToken = body.access_token;
        userInputs.refreshToken = body.refresh_token;

        // Notifies user
        res.send('Successfully signed in!');
    } catch(err) {
        res.send(err.message);
    }

    if (!userInputs.accessToken) {
        console.log("\nUnable to find access token. ");
        return prompts.signin(redirectLoginUrl);
    }
    return await promptSyncFlow();
});

app.listen(port);
console.log(logo.scimSync);
prompts.quit();
prompts.signin(redirectLoginUrl);