require('dotenv').config();
const express = require('express');
const url = require('url');
const readline = require('readline');
const graph = require('@databricks-scim-automation/graph');

const params = {
    accessToken: undefined,
    refreshToken: undefined,
    scimConnectorGalleryAppTemplateId: undefined,
    scimConnectorGalleryAppName: undefined,
    aadGroupFilterDisplayName: undefined,
    syncJobTemplateId: undefined,
    databricksWorkspaceUrl: undefined, 
    databricksWorkspacePat: undefined, 
};

// Required User Inputs and Default Values
const inputPrompts = [
    { message: 'SCIM connector gallery app template ID', key: 'scimConnectorGalleryAppTemplateId', default: '9c9818d2-2900-49e8-8ba4-22688be7c675' },
    { message: 'SCIM connector gallery app display name', key: 'scimConnectorGalleryAppName', default: undefined },
    { message: 'filter AAD group by display name', key: 'aadGroupFilterDisplayName', default: 'Databricks-SCIM' },
    { message: 'sync job template ID', key: 'syncJobTemplateId', default: 'dataBricks' },
    { message: `databricks workspace URL`, key: 'databricksWorkspaceUrl', default: process.env.DATABRICKS_URL },
    { message: `databricks workspace PAT`, key: 'databricksWorkspacePat', default: process.env.DATABRICKS_PAT },
];

const port = process.env.PORT || 8000;
const host = `localhost:${port}`;
const redirectLoginUrl = graph.getRedirectLoginUrl({ host });
const app = express();

function promptSignIn() {
    console.log('Click on the following link to sign in: ');
    console.log(redirectLoginUrl);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function promptSyncFlow() {
    console.log("\nPress ^C at any time to quit.");
    try {
        for (let prompt of inputPrompts) {
            const message = prompt.default ? `${prompt.message}: (${prompt.default})` : `${prompt.message}: `;
            params[prompt.key] = await new Promise((resolve, reject) => rl.question(message, input => {
                const answer = input || prompt.default;
                answer ? resolve(answer) : reject(`ERROR: Requires user input for ${prompt.message}`);
            })).catch(err => {
                throw new Error(err);
            });
        }
        rl.close();
        console.log("\n==========================================================================\nLET'S SYNC THE SERVICE PRINCIPAL!");
        const syncStatus = await graph.startSyncProcess(params);
        console.log(syncStatus);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}

app.get('/', async (req, res) => {
    try {
        const { query: { code } } = url.parse(req.url, true);
        if (!code) {
            throw new Error('Unable to get sign-in code');
        }
        const response = await graph.postAccessToken(code, { host });
        if (response.status !== 200) {
            throw new Error('Unable to get access tokens');
        }
        const body = await response.json();
        params.accessToken = body.access_token;
        params.refreshToken = body.refresh_token;
        res.send('Successfully signed in!');
    } catch(err) {
        res.send(err.message);
    }

    if (!params.accessToken) {
        console.log("\nUnable to find access token. ");
        return promptSignIn();
    }
    return await promptSyncFlow();
});

app.listen(port);
promptSignIn();