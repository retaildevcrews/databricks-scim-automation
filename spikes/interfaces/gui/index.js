const express = require('express');
const { getHomepage } = require('./controllers/homepage');
const {
    getRedirectLogin,
    postAccessToken,
    postRefreshAccessToken,
} = require('./controllers/tokens');
const { postScimConnectorGalleryApp } = require('./controllers/galleryapps');
const { getAadGroups } = require('./controllers/aadgroups');
const {
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    getServicePrincipalSyncJobStatus,
} = require('./controllers/serviceprincipals');
const { sendDefault } = require('./controllers/default');

const app = express();

app.get('/', getHomepage);
app.get('/login', getRedirectLogin);
app.post('/accessToken', postAccessToken);
app.post('/refreshAccessToken', postRefreshAccessToken);
app.post('/scimConnectorGalleryApp', postScimConnectorGalleryApp);
app.get('/aadGroups', getAadGroups);
app.get('/servicePrincipal', getServicePrincipal);
app.post('/aadGroupToScim', postAddAadGroupToServicePrincipal);
app.post('/validateCredentials', postValidateServicePrincipalCredentials);
app.put('/saveCredentials', putSaveServicePrincipalCredentials);
app.post('/createSyncJob', postCreateServicePrincipalSyncJob);
app.post('/startSyncJob', postStartServicePrincipalSyncJob)
app.get('/syncJobStatus', getServicePrincipalSyncJobStatus);
app.all('*', sendDefault);

const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port);