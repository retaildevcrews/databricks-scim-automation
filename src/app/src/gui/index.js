const express = require('express');
const path = require('path');
const {
    getHomepage,
    getKeyvaultSecrets,
    getRedirectLogin,
    postAccessToken,
    postRefreshAccessToken,
    postScimConnectorGalleryApp,
    getAadGroups,
    getServicePrincipal,
    postAddAadGroupToServicePrincipal,
    postCreateServicePrincipalSyncJob,
    postCreateDatabricksPat,
    postValidateServicePrincipalCredentials,
    putSaveServicePrincipalCredentials,
    postStartServicePrincipalSyncJob,
    getServicePrincipalSyncJobStatus,
} = require('./syncCallbacks');

const app = express();

// make public directory available
app.use(express.static(path.join(__dirname, '../gui')));

app.get('/', getHomepage);
app.get('/keyvault', getKeyvaultSecrets);
app.get('/login', getRedirectLogin);
app.post('/accessToken', postAccessToken);
app.post('/refreshAccessToken', postRefreshAccessToken);
app.post('/scimConnectorGalleryApp', postScimConnectorGalleryApp);
app.get('/aadGroups', getAadGroups);
app.get('/servicePrincipal', getServicePrincipal);
app.post('/aadGroupToScim', postAddAadGroupToServicePrincipal);
app.post('/databricksPat', postCreateDatabricksPat);
app.post('/validateCredentials', postValidateServicePrincipalCredentials);
app.put('/saveCredentials', putSaveServicePrincipalCredentials);
app.post('/createSyncJob', postCreateServicePrincipalSyncJob);
app.post('/startSyncJob', postStartServicePrincipalSyncJob)
app.get('/syncJobStatus', getServicePrincipalSyncJobStatus);
app.all('*', (req, res) => res.set('Content-Type', 'text/plain').status(405).send('Unsupported Method'));

const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port);