// Default Azure App Service
require('dotenv').config();
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-fetch');

// From App registrations
const azureTenantId = process.env.TENANT_ID;
const spClientId = process.env.OAUTH_APP_ID;
const clientSecret = process.env.OAUTH_APP_PASSWORD;

function getOriginUrl(req) {
    const { headers: { origin, host } } = req;
    return origin || (host.includes('localhost') ? `http://${host}` : `https://${host}`);
}

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
function getRedirectLogin(req) {
    // Sign in request URI
    const params = [
        { key: 'client_id', value: spClientId },
        { key: 'response_type', value: 'code' },
        { key: 'redirect_uri', value: getOriginUrl(req) },
        { key: 'response_mode', value: 'query' },
        { key: 'scope', value: 'openid%20offline_access%20https%3A%2F%2Fgraph.microsoft.com%2F.default' },
        { key: 'state', value: 12345 },
    ];

    const redirectUrl = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize?${params.map(({ key, value }) => `${key}=${value}`).join('&')}`

    return { response: redirectUrl, status: 302 };
}

async function getDatabricksUsers(query) {
    const { databricksDomainName } = query;
    const scimApi = `${databricksDomainName}/api/2.0/preview/scim/v2`;

    // TODO: get from key vault???
    const token = 'dapi5b33859ef12f7039b937146175a9d313';
    const databricksUsers = await fetch(`${scimApi}/Users`, {
        method: 'GET',
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

async function getAuthTokenForGraphApi(req, code) {
    const formParams = [
        { key: 'client_id', value: spClientId },
        { key: 'scope', value: 'https://graph.microsoft.com/mail.read' },
        { key: 'redirect_uri', value: getOriginUrl(req) },
        { key: 'grant_type', value: 'authorization_code' },
        { key: 'client_secret', value: clientSecret },
        { key: 'code', value: code },
    ].map(({ key, value }) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');

    // TODO: This is the token they'll have in key vault
    const response = await fetch(`https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`, {
        // TODO: CHECK RESPONSE FOR NOT FOUND TENANT ID
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: formParams,
    })
        .then(res => res.json())
        .then(body => {
            if (body.error === 'invalid_grant') {
                throw new Error ('Unusable user code. Please login again...');
            }
            return body;
        })
        .catch(err => ({
            response: JSON.stringify({ message: err.message,}),
            status: 401,
            contentType: 'application/json',
        }));
    return response;
}

function sendResponse(res, payload) {
    if (payload.status === 302 ) {
        res.writeHead(302, { Location: payload.response });
    } else {
        res.writeHead(payload.status, { ...(payload.contentType && { 'Content-Type': payload.contentType }) })
        res.write(payload.response);
    }
    res.end();
}

async function postDatabricksGalleryApp(req, res) {
    let data = [];
    req.on('data', buffer => {
        data.push(buffer);
    }).on('end', async () => {
        try {
            const body = JSON.parse(data);
            const authTokenResponse = await getAuthTokenForGraphApi(req, body.code);
            if (authTokenResponse.status === 401) {
                return sendResponse(res, authTokenResponse);
            }

            const postGalleryAppResponse = await fetch(`https://graph.microsoft.com/beta/applicationTemplates/${body.databricksScimId}/instantiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authTokenResponse.access_token}`,
                },
                // Does not matter if displayName is already taken
                body: JSON.stringify({ displayName: body.galleryAppName }),
            }).catch(err => console.error({ err }));

            // Checks if template ID for gallery app is not found
            if (postGalleryAppResponse.status === 400) {
                return sendResponse(res, {
                    response: JSON.stringify({ message: `${postGalleryAppResponse.statusText}: Please check databricks scim id...` }),
                    status: postGalleryAppResponse.status,
                    contentType: 'application/json',
                });
            }

            postGalleryAppResponse.json().then((response) => (
                sendResponse(res, {
                    response: JSON.stringify({ message: `Successfully created gallery app: ${body.galleryAppName}...`, access_token: authTokenResponse.access_token }),
                    status: postGalleryAppResponse.status,
                    contentType: 'application/json',
                })
            ));
        } catch (err) {
            return sendResponse(res, { response: err, status: 500, contentType: undefined });
        }
    });
}

async function getAadGroups(authorization, query) {
    const response = await fetch(`https://graph.microsoft.com/beta/groups?filter=displayname+eq+'${query.filterDisplayName}'`, {
        headers: { Authorization: `Bearer ${authorization}` },
    });

    const body = await response.json();

    if (response.status !== 200) {
        return {
            response: JSON.stringify({ message: body.error.message }),
            status: response.status,
            contentType: 'application/json',
        };
    }

    return {
        response: JSON.stringify({ groups: body.value.map(({ id, displayName }) => ({ id, displayName })) }),
        status: 200,
        contentType: 'application/json',
    };
}

async function getRoute(req, res) {
    const { pathname, query } = url.parse(req.url, true);
    switch (pathname) {
        case '/':
            return sendResponse(res, getInitialHtml());
        case '/login':
            return sendResponse(res, getRedirectLogin(req));
        case '/databricksUsers':
            return sendResponse(res, await getDatabricksUsers(query));
        case '/aadGroups':
            return sendResponse(res, await getAadGroups(req.headers.authorization, query));
        default:
            return sendResponse(res, { response: 'Unidentified Path', status: 404, contentType: undefined });
    }
}

async function postRoute(req, res) {
    const { pathname, query } = url.parse(req.url, true);
    // res write is completed in function
    switch (pathname) {
        case '/databricksGalleryApp':
            return postDatabricksGalleryApp(req, res);
        default:
            return sendResponse(res, { response: 'Unidentified Path', status: 404, contentType: undefined });
    }
}

const server = http.createServer();
server.on('request', async (req, res) => {
    switch (req.method) {
        case 'GET':
            return getRoute(req, res);
        case 'POST':
            return postRoute(req, res);
        default:
            res.writeHead(405);
            res.write('Unsupported Method');
            res.end();
    }
});

const port = process.env.PORT || 1337;
server.listen(port);
console.log("Server running at http://localhost:%d", port);
