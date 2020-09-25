const express = require('express');
const path = require('path');
const { getHomepage } = require('./controllers/homepage');
const { getKeyvaultSecrets } = require('./controllers/keyvault');
const {
    getRedirectLogin,
    postGraphAccessToken,
    postRefreshGraphAccessToken,
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

// make public directory available
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', getHomepage);
app.get('/keyvault', getKeyvaultSecrets);
app.get('/login', getRedirectLogin);
app.post('/graphAccessToken', postGraphAccessToken);
app.post('/refreshGraphAccessToken', postRefreshGraphAccessToken);
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