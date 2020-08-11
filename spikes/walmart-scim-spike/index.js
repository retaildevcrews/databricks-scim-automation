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

// Login must be user of Application
function getRedirectLogin() {
    // From Enterprise Application
    // const azureTenantId = '9c26242b-1b00-450c-98b0-a31412ad5a0e';
    // const spClientId = 'd08b61d1-a22f-47ef-bec2-24c0016579ef';
    // const clientSecret = 'dapi5b33859ef12f7039b937146175a9d313';

    // From App registrations
    const azureTenantId = '9c26242b-1b00-450c-98b0-a31412ad5a0e'
    const spClientId = '6ff577ed-e44b-4f35-88a9-12cbafd2f597';
    const clientSecret = 'b.-CfBPGpr11dfOYL~C4xVjQ1-1b5e1F_d';

    // Sign in request URI
    const params = [
        { key: 'client_id', value: spClientId },
        { key: 'response_type', value: 'code' },
        // reply URL needs to be configured for application
        { key: 'redirect_uri', value: 'http://localhost:1337' },
        { key: 'response_mode', value: 'query' },
        { key: 'scope', value: 'openid%20offline_access%20https%3A%2F%2Fgraph.microsoft.com%2F.default' },
        { key: 'state', value: 12345 },
    ];

    const redirectUrl = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize?${params.map(({ key, value }) => `${key}=${value}`).join('&')}`

    return { response: redirectUrl, status: 302 };
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
        case '/login':
            return getRedirectLogin();
        case '/databricksUsers':
            return databricksUsers(method, query);
        default:
            return { response: 'Unidentified Path', status: 404, contentType: undefined };
    }
}

const server = http.createServer();
server.on('request', async (req, res) => {
    const { response, status, contentType } = await getPathResponse(req);
    if (status === 302 ) {
        res.writeHead(302, { Location: response });
    } else {
        res.writeHead(status, { ...(contentType && { 'Content-Type': contentType }) })
        res.write(response);
    }
    res.end();
});

// fetch('https://login.microsoftonline.com/9c26242b-1b00-450c-98b0-a31412ad5a0e/oauth2/v2.0/token', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-url-form-urlencoded'},
//     body: {
//         client_id: 'd08b61d1-a22f-47ef-bec2-24c0016579ef',
//         scope: 'https://graph.microsoft.com/mail.read',
//         redirect_uri: 'https://localhost',
//         grant_type: 'authorization_code',
//         client_secret: 'dapi5b33859ef12f7039b937146175a9d313',
//         code: 'OAQABAAIAAAAm-06blBE1TpVMil8KPQ41EJlDYDIEO6wVGDqjzf3ouDkqcsY7U66lbqMEZRlMEl02Jajs9FbrhlHLNj3kVSBxywXaYFa-lJFOT2MLi-1eAUAg_gz5OmbhvudN6IINFNv_sb0Rw34teK4v7KJIDFUWIdOdLPkx3vGxZ4o-l7ADvqUfUhqKvrqaTF66o_b8hHS_ZP5nl7QVtbp8Ycwvo9EJlX8-rAEBanpnazmmppMw3TJsG_XsaNCkT0Q2X3sD6CLmHTs3pgcA65V0ZQTCavDglSMfIj5pCOwf_D-2QM1Kj3inoQ6R-2t8rUni1WcVz4AewfTCjF_acDTTJMEtN6-SYenuaegfv95pj9dATnrgj1VCifkCzF781WuPl1BTFdccumgp_u6MsNVCOKkA3spf3TeUUAnFkum3cu-PUIfOlvHnnA4eyo67c0kq2Gcy9j5IAfIMxn9YWZDIMqFb_GCRJYM7eQ2g4QxHiHvaInkGa-TL4Hn_7toQGQnpfzaL-PUP4dOqL3u2VQCDVOxU4szSNhnbRNlLkI8ZPTTdzfWEZnwcwNTXsFn1OZ02E1IWalQjskatrdVTWQJBDrPsRyV9Vif7dwrK1DXBLrFGJeUzKPvH2SdfkEp89QVpgESwHCQgAA',
//     },
// })
//     .then(res => console.log({ res }))
//     .catch(err => console.log({ err }));

// fetch('https://graph.microsoft.com/beta/applicationTemplates', {
//     method: 'GET',
//     headers: { Authorization: 'Bearer dapi5b33859ef12f7039b937146175a9d313' }
// })
//     .then(res => console.log({ res }))
//     .catch(err => console.log({ err }));

const port = process.env.PORT || 1337;
server.listen(port);
console.log("Server running at http://localhost:%d", port);
