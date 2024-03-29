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
        const errorMessage = 'Error reading and sending html';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
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
    return { response: redirectUrl, status: 302, contentType: undefined };
}

async function postAccessToken(req) {
    try {
        const { query: { code } } = url.parse(req.url, true);
        const formParams = [
            { key: 'client_id', value: spClientId },
            { key: 'scope', value: 'https://graph.microsoft.com/mail.read' },
            { key: 'redirect_uri', value: getOriginUrl(req) },
            { key: 'grant_type', value: 'authorization_code' },
            { key: 'client_secret', value: clientSecret },
            { key: 'code', value: code },
        ].map(({ key, value }) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');

        // TODO: This is the token they'll have in key vault (would need refresh mechanism)
        // TODO: May use certificate instead of token
        const response = await fetch(`https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
            body: formParams,
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 200) {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch(err) {
        const errorMessage = 'Error fetching tokens';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postRefreshAccessToken(req) {
    try {
        const formParams = [
            { key: 'client_id', value: spClientId },
            { key: 'scope', value: 'https://graph.microsoft.com/mail.read' },
            { key: 'redirect_uri', value: getOriginUrl(req) },
            { key: 'grant_type', value: 'refresh_token' },
            { key: 'client_secret', value: clientSecret },
            { key: 'refresh_token', value: req.headers.authorization },
        ].map(({ key, value }) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');

        // TODO: This is the token they'll have in key vault (would need refresh mechanism)
        // TODO: May use certificate instead of token
        const response = await fetch(`https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: formParams,
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 200) {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch(err) {
        const errorMessage = 'Error fetching tokens';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postDatabricksGalleryApp(req) {
    try {
        const { query: { scimAppTemplateId, scimConnectorGalleryAppName } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/applicationTemplates/${scimAppTemplateId}/instantiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${req.headers.authorization}`,
            },
            // Does not matter if displayName is already taken
            body: JSON.stringify({ displayName: scimConnectorGalleryAppName }),
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 201) {
            const scimServicePrincipalObjectId = body.servicePrincipal.objectId;
            return {
                status: response.status,
                contentType,
                response: JSON.stringify({ scimServicePrincipalObjectId }),
            };
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch(err) {
        const errorMessage = 'Error creating scim gallery app';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function getAadGroups(req) {
    try {
        const { query: { filterDisplayName } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/groups?filter=displayname+eq+'${filterDisplayName}'`, {
            headers: { Authorization: `Bearer ${req.headers.authorization}` },
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 200) {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body.value.map(({ id, displayName }) => ({ aadGroupId: id, displayName }))),
            }
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch (err) {
        const errorMessage = 'Error fetching aad groups';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    };
}

// Use getServicePrincipals to get appRoleId
// async function getAppRoleAssignments(req) {
//     try {
//         const { query: { aadGroupId } } = url.parse(req.url, true);
//         const response = await fetch(`https://graph.microsoft.com/beta/groups/${aadGroupId}/appRoleAssignments`, {
//             method: 'GET',
//             headers: { Authorization: `Bearer ${req.headers.authorization}` },
//         });
//         const contentType = response.headers._headers['content-type'];
//         const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
//         if (response.status === 200) {
//             return {
//                 status: response.status,
//                 contentType,
//                 response: JSON.stringify(body.value),
//             }
//         } else {
//             return {
//                 status: response.status,
//                 contentType,
//                 response: JSON.stringify(body),
//             };
//         }
//     } catch (err) {
//         const errorMessage = 'Error fetching aad groups';
//         console.error(errorMessage + ': ', err);
//         return {
//             response: errorMessage,
//             status: 500,
//             contentType: 'text/plain',
//         }
//     };
// }

async function getServicePrincipals(req) {
    try {
        const { query: { scimServicePrincipalObjectId } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${req.headers.authorization}` },
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 200) {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body.appRoles),
            }
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch (err) {
        const errorMessage = 'Error fetching service principals';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postAadGroupToScim(req) {
    try {
        const { query: {
            scimServicePrincipalObjectId,
            aadGroupId,
            appRoleId,
        } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/appRoleAssignments`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                principalId: aadGroupId,
                resourceId: scimServicePrincipalObjectId,
                appRoleId: appRoleId,
            }),
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        return {
            status: response.status,
            contentType,
            response: JSON.stringify(body),
        };
    } catch (err) {
        const errorMessage = 'Error adding aad group to scim';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postCreateSyncJob(req) {
    try {
        const { query: { jobTemplateId, scimServicePrincipalObjectId } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/synchronization/jobs`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ templateId: jobTemplateId }),
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 201) {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body.id),
            };
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postValidateCredentials(req) {
    try {
        const { query: { scimServicePrincipalObjectId, syncJobId, databricksUrl } } = url.parse(req.url, true);
        const secretToken = req.headers['x-secret-token'] === 'default' ? process.env.DATABRICKS_WS_TOKEN : req.headers['x-secret-token'];
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/synchronization/jobs/${syncJobId}/validateCredentials`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credentials: [
                { key: 'BaseAddress', value: databricksUrl },
                { key: 'SecretToken', value: secretToken },
            ]}),
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        return {
            status: response.status,
            contentType,
            response: JSON.stringify(body),
        };
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function putSaveCredentials(req) {
    try {
        const { query: { scimServicePrincipalObjectId, syncJobId, databricksUrl } } = url.parse(req.url, true);
        const secretToken = req.headers['x-secret-token'] === 'default' ? process.env.DATABRICKS_WS_TOKEN : req.headers['x-secret-token'];
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/synchronization/secrets`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: [
                { key: 'BaseAddress', value: databricksUrl },
                { key: 'SecretToken', value: secretToken },
            ]}),
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        return {
            status: response.status,
            contentType,
            response: JSON.stringify(body),
        };
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function postStartSyncJob(req) {
    try {
        const { query: { scimServicePrincipalObjectId, syncJobId } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/synchronization/jobs/${syncJobId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${req.headers.authorization}` },
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        return {
            status: response.status,
            contentType,
            response: JSON.stringify(body),
        };
    } catch (err) {
        const errorMessage = 'Error syncing jobs';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

async function getSyncJobStatus(req) {
    try {
        const { query: { scimServicePrincipalObjectId, syncJobId } } = url.parse(req.url, true);
        const response = await fetch(`https://graph.microsoft.com/beta/servicePrincipals/${scimServicePrincipalObjectId}/synchronization/jobs/${syncJobId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${req.headers.authorization}` },
        });
        const contentType = response.headers._headers['content-type'];
        const body = contentType.some(type => type.includes('json')) ? await response.json() : await response.text();
        if (response.status === 200) {
            const { lastSuccessfulExecution, lastSuccessfulExecutionWithExports, lastExecution } = body.status;
            return {
                status: response.status,
                contentType,
                response: JSON.stringify({
                    lastSuccessfulExecution,
                    lastSuccessfulExecutionWithExports,
                    lastExecution,
                }),
            };
        } else {
            return {
                status: response.status,
                contentType,
                response: JSON.stringify(body),
            };
        }
    } catch (err) {
        const errorMessage = 'Error fetching sync job status';
        console.error(errorMessage + ': ', err);
        return {
            response: errorMessage,
            status: 500,
            contentType: 'text/plain',
        }
    }
}

function sendResponse(res, payload) {
    if (payload.status === 302 ) {
        res.writeHead(payload.status, { Location: payload.response });
    } else {
        res.writeHead(payload.status, { ...(payload.contentType && { 'Content-Type': payload.contentType }) })
        res.write(payload.response);
    }
    res.end();
}

async function getRoute(req, res) {
    const { pathname, query } = url.parse(req.url, true);
    switch (pathname) {
        case '/':
            return sendResponse(res, getInitialHtml());
        case '/login':
            return sendResponse(res, getRedirectLogin(req));
        case '/aadGroups':
            return sendResponse(res, await getAadGroups(req));
        // case '/appRoleAssignments':
        //     return sendResponse(res, await getAppRoleAssignments(req));
        case '/servicePrincipals':
            return sendResponse(res, await getServicePrincipals(req))
        case '/syncJobStatus':
            return sendResponse(res, await getSyncJobStatus(req));
        default:
            return sendResponse(res, { response: 'Unidentified Path', status: 404, contentType: 'text/plain' });
    }
}

async function postRoute(req, res) {
    const { pathname } = url.parse(req.url, true);
    switch (pathname) {
        case '/accessToken':
            return sendResponse(res, await postAccessToken(req));
        case '/refreshAccessToken':
            return sendResponse(res, await postRefreshAccessToken(req));
        case '/databricksGalleryApp':
            return sendResponse(res, await postDatabricksGalleryApp(req));
        case '/aadGroupToScim':
            return sendResponse(res, await postAadGroupToScim(req));
        case '/createSyncJob':
            return sendResponse(res, await postCreateSyncJob(req));
        case '/validateCredentials':
            return sendResponse(res, await postValidateCredentials(req));
        case '/startSyncJob':
            return sendResponse(res, await postStartSyncJob(req));
        default:
            return sendResponse(res, { response: 'Unidentified Path', status: 404, contentType: 'text/plain' });
    }
}

async function putRoute(req, res) {
    const { pathname } = url.parse(req.url, true);
    switch (pathname) {
        case '/saveCredentials':
            return sendResponse(res, await putSaveCredentials(req));
        default:
            return sendResponse(res, { response: 'Unidentified Path', status: 404, contentType: 'text/plain' })
    }
}

const server = http.createServer();
server.on('request', async (req, res) => {
    switch (req.method) {
        case 'GET':
            return getRoute(req, res);
        case 'POST':
            return postRoute(req, res);
        case 'PUT':
            return putRoute(req, res);
        default:
            sendResponse(res, { response: 'Unsupported Method', status: 405, contentType: 'text/plain' });
    }
});

const port = process.env.PORT || 1337;
server.listen(port);
console.log("Server running at http://localhost:%d", port);
