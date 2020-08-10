// https://github.com/microsoftgraph/msgraph-sdk-javascript
// require('isomorphic-fetch');
// const { Client } = require('@microsoft/microsoft-graph-client');

// Server-side via Custom Authentication Provider: https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/CustomAuthenticationProvider.md
// const AuthenticationProvider = require('@microsoft/microsoft-graph-client');
// console.log({ AuthenticationProvider });
// const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
// class MyAuthenticationProvider extends AuthenticationProvider {
//     /**
//      * This method will get called before every req to the msgraph server
//      * This should return a Promise that resolves to an accessToken (in case of success) or rejects with error (in case of failure)
//      * Basically this method will contain the implementation for getting and refreshing accessTokens
//      */
//     async getAccessToken() {}
// }
// let clientOptions = { authProvider: new MyAuthenticationProvider() };
// let clientOptions = { authProvider: new AuthenticationProvider() };
// const client = Client.initWithMiddleware(clientOptions)
// async function getMeFromGraph() {
//     try {
//         let userDetails = await client.api('/me').get();
//         console.log('github', userDetails);
//     } catch (err) {
//         throw err;
//     }
// }

// Default Azure App Service
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-fetch');

function getInitialHtml() {
    const htmlPath = path.resolve(__dirname, './index.html');
    try {
        return {
            response: fs.readFileSync(htmlPath),
            status: 200,
            contentType: 'text/html',
        };
    } catch (err) {
        console.error('Error reading and sending html', err);
        return {
            response: 'Content not found',
            status: 404,
            contentType: undefined,
        }
    }
}

// Currently only handles GET method
async function databricksUsers(method, query) {
    const { databricksDomainName } = query;
    const scimApi = `${databricksDomainName}/api/2.0/preview/scim/v2`;

    // TODO: get from key vault
    const token = 'dapi5b33859ef12f7039b937146175a9d313';
    const databricksUsers = await fetch(`${scimApi}/Users`, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/scim+json',
            'Content-Type': 'application/scim+json',
        },
    }).then(res => res.json())
    .catch((err) => {
        const displayErr = `Unable to fetch users from databricks: ${err}`;
        console.error(displayErr);
        return {
            response: displayErr,
            status: 500,
            contentType: undefined,
        }
    });
    return {
        response: JSON.stringify(databricksUsers),
        status: 200,
        contentType: 'application/json',
    };
}

async function getPathResponse(req) {
    const { method } = req;
    const { pathname, query } = url.parse(req.url, true);
    switch (pathname) {
        case '/':
            return getInitialHtml();
        case '/databricksUsers':
            return databricksUsers(method, query);
        default:
            return { response: 'Unidentified Path', status: 404, contentType: undefined };
    }
}

const server = http.createServer();
server.on('request', async (req, res) => {
    const { response, status, contentType } = await getPathResponse(req);
    res.writeHead(status, { ...(contentType && { 'Content-Type': contentType }) })
    res.write(response);
    res.end();
});
const port = process.env.PORT || 1337;
server.listen(port);
console.log("Server running at http://localhost:%d", port);
