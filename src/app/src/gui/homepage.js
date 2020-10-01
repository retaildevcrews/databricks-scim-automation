const logElement = document.getElementById('log');
function addToLog(content) {
    const childElement = document.createElement('div')
    childElement.innerHTML = content;
    logElement.appendChild(childElement)
    // Scroll Log to the Bottom
    logElement.scrollTop = logElement.scrollHeight - logElement.clientHeight;
}

// Get Code Value from URL
function getCodeValueFromUrl() {
    const codeParam = document.location.search.split('&').filter(param => param.includes('code='))[0];
    return codeParam ? codeParam.split('=')[1] : '';
}

// Update UI with Session Storage
const sessionInputs = [
    { key: 'tenantId', selector: 'input.tenant-id' },
    { key: 'clientId', selector: 'input.client-id' },
    { key: 'clientSecret', selector: 'input.client-secret' },
    { key: 'graph', selector: 'input#graph-auth-code' },
    { key: 'databricks', selector: 'input#databricks-auth-code' },
];
sessionInputs.forEach(({ key, selector }) => {
    const item = window.sessionStorage.getItem(key);
    if (item) {
        document.querySelectorAll(selector).forEach(element => element.value = item);
    }
});
const codeStatus = window.sessionStorage.getItem('codeStatus');
if (codeStatus) {
    const codeUrl = getCodeValueFromUrl();
    window.sessionStorage.setItem(codeStatus, codeUrl);
    const codeElement = document.querySelector(`#token input#${codeStatus}-auth-code`);
    codeElement.value = codeUrl;
    window.sessionStorage.removeItem('codeStatus');
}

// Log: User Login Status
const hasAuthCodes = !!(window.sessionStorage.getItem('graph') && window.sessionStorage.getItem('databricks'));
addToLog(hasAuthCodes ? 'Logged in...' : 'Needs auth codes...');

// Get key vault secrets, tenant ID, client ID, and client secret
async function getKeyvaultSecrets() {
    try {
        addToLog('<br />Getting key vault secrets (tenant id, client id, and client secret)...');
        const keyvaultUrl = document.querySelector('#authcode input.keyvault-url').value;
        if (!keyvaultUrl) {
            return logMissingInputs([{
                value: keyvaultUrl,
                message: `Key vault url required to get key vault secrets...`,
            }]);
        }
        const response = await fetch(`${document.location.origin}/keyvault?url=${encodeURI(keyvaultUrl)}`);
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            // Display and store tenant ID
            const tenantIdElements = document.querySelectorAll('input.tenant-id');
            tenantIdElements.forEach(element => element.value = body.TenantID);
            window.sessionStorage.setItem('tenantId', body.TenantID);
            // Display and store client ID
            const clientIdElements = document.querySelectorAll('input.client-id');
            clientIdElements.forEach(element => element.value = body.AppClientID);
            window.sessionStorage.setItem('clientId', body.AppClientID);
            // Display and store client secret 
            const clientSecretElements = document.querySelectorAll('input.client-secret');
            clientSecretElements.forEach(element => element.value = body.AppClientSecret);
            window.sessionStorage.setItem('clientSecret', body.AppClientSecret);
            addToLog(`Fetched secrets from key vault: tenant ID (${body.TenantID}), client ID (${body.AppClientID}), client secret (${body.AppClientSecret})...`);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while fetching key vault secrets...');
    }
}
document.querySelector('#authcode > button.keyvault-secrets').onclick = getKeyvaultSecrets;

// Login to Create Code for Graph Access Token
async function redirectToLogin(codeType) {
    addToLog('<br />Redirecting to signin portal..');
    const tenantId = document.querySelector('#authcode input.tenant-id').value;
    const clientId = document.querySelector('#authcode input.client-id').value;
    if (!tenantId || !clientId) {
        return logMissingInputs([{
            value: tenantId,
            message: `Tenant id required to redirect to signin portal...`,
        }, {
            value: clientId,
            message: `Client id required to redirect to signin portal...`,
        }]);
    }
    const signinUrl = await fetch(`${document.location.origin}/login?tenantId=${tenantId}&clientId=${clientId}`);
    window.sessionStorage.setItem('codeStatus', codeType);
    return window.location.href = await signinUrl.text();
}
const getGraphAuthCodeElement = document.querySelector('#authcode > button#get-graph-auth-code');
getGraphAuthCodeElement.onclick = () => redirectToLogin('graph');
const getDatabricksAuthCodeElement = document.querySelector('#authcode > button#get-databricks-auth-code');
getDatabricksAuthCodeElement.onclick = () => redirectToLogin('databricks');

// Logs Messages for Missing Values
function logMissingInputs(inputs) {
    inputs.reduce((time, { value, message }) => {
        if (!value) {
            setTimeout(() => addToLog(message), time);
            return time + 800;
        }
        return time;
    }, 800);
}

// POST for Graph Access Token
// postAccessToken needs code
async function postAccessToken(type) {
    try {
        addToLog(`<br />Creating ${type} access token...`);
        const codeElement = document.querySelector(`#token input#${type}-auth-code`);
        const code = codeElement.value;
        const tenantId = document.querySelector('#token input.tenant-id').value;
        const clientId = document.querySelector('#token input.client-id').value;
        const clientSecret = document.querySelector('#token input.client-secret').value;
        if (!code || !tenantId || !clientId || !clientSecret) {
            return logMissingInputs([{
                value: code,
                message: `Login required to get graph access token...`,
            }, {
                value: tenantId,
                message: `Key vault secrets required to get graph access token...`,
            }, {
                value: clientId,
                message: `Key vault secrets required to get graph access token...`,
            }, {
                value: clientSecret,
                message: `Key vault secrets required to get graph access token...`,
            }]);
        }
        codeElement.value = '';
        window.sessionStorage.removeItem(type);
        const response = await fetch(`${document.location.origin}/accessToken?type=${type}&code=${code}&tenantId=${tenantId}&clientId=${clientId}`, {
            method: 'POST',
            headers: { 'X-Client-Secret': clientSecret },
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            // Display access token
            const accessTokenElements = document.querySelectorAll(`input.${type}-access-token`);
            accessTokenElements.forEach(element => element.value = body.access_token);
            addToLog(`Created ${type} access token: ${body.access_token}...`);
            // Display refresh graph token
            const refreshTokenElement = document.querySelector(`input#refresh-${type}-token`);
            refreshTokenElement.value = body.refresh_token;
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error_description);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog(`Error while fetching ${type} access token...`);
    }
}
document.querySelector('#token button#post-graph-access-token').onclick = () => postAccessToken('graph');
document.querySelector('#token button#post-databricks-access-token').onclick = () => postAccessToken('databricks');

async function postRefreshAccessToken(type) {
    try {
        addToLog(`<br />Refreshing ${type} access token...`);
        const refreshToken = document.querySelector(`#token input#refresh-${type}-token`).value;
        const tenantId = document.querySelector('#token input.tenant-id').value;
        const clientId = document.querySelector('#token input.client-id').value;
        const clientSecret = document.querySelector('#token input.client-secret').value;
        if (!refreshToken || !tenantId || !clientId || !clientSecret) {
            return logMissingInputs([{
                value: refreshToken,
                message: `Refresh ${type} token required to get ${type} access token...`,
            }, {
                value: tenantId,
                message: `Key vault secrets required to get ${type} access token...`,
            }, {
                value: clientId,
                message: `Key vault secrets required to get ${type} access token...`,
            }, {
                value: clientSecret,
                message: `Key vault secrets required to get ${type} access token...`,
            }]);
        }
        const response = await fetch(`${document.location.origin}/refreshAccessToken?type=${type}&tenantId=${tenantId}&clientId=${clientId}`, {
            method: 'POST',
            headers: {
                'X-Refresh-Token': refreshToken,
                'X-Client-Secret': clientSecret,
            }
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            // Display access token
            const accessTokenElements = document.querySelectorAll(`input.${type}-access-token`);
            accessTokenElements.forEach(element => element.value = body.access_token);
            addToLog(`Created ${type} access token: ${body.access_token}...`);
            // Display refresh token
            const refreshTokenElement = document.querySelector(`input#refresh-${type}-token`);
            refreshTokenElement.value = body.refresh_token;
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error_description);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog(`Error while fetching ${type} access token...`);
    }
}
document.querySelector('#token button#post-refresh-graph-token').onclick = () => postRefreshAccessToken('graph');
document.querySelector('#token button#post-refresh-databricks-token').onclick = () => postRefreshAccessToken('databricks');

// POST instance of scim connector from AAD app gallery into directory
// createSCIMApp needs appName and scimAppTemplateId
// returns scimSPObjId for addGroupToSCIM, createSyncJob, validateCredentials, saveCredentials, startSyncJob, and monitorJob
async function postScimConnectorGalleryApp() {
    try {
        addToLog('<br/>Creating scim connector gallery app...')
        const graphAccessToken = document.querySelector('#post-scim-connector-gallery-app input.graph-access-token').value;
        const scimAppTemplateId = document.querySelector('#post-scim-connector-gallery-app input#scim-app-template-id').value;
        const scimConnectorGalleryAppName = document.querySelector('#post-scim-connector-gallery-app input.scim-connector-gallery-app-name').value;
        // Validate data required to create SCIM Connector Gallery App
        if (!graphAccessToken || !scimAppTemplateId || !scimConnectorGalleryAppName) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to create scim connector gallery app...' },
                { value: scimAppTemplateId, message: 'Scim app template id required to create scim connector gallery app...'},
                { value: scimConnectorGalleryAppName, message: 'Scim connector gallery app name required to create scim connector gallery app...'},
            ]);
        }
        const response = await fetch(
            encodeURI(`${document.location.origin}/scimConnectorGalleryApp?galleryAppTemplateId=${scimAppTemplateId}&galleryAppName=${scimConnectorGalleryAppName}`),
            { method: 'POST', headers: { 'X-Access-Token': graphAccessToken } },
        );
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 201) {
            const scimServicePrincipalObjectIdElements = document.querySelectorAll('input.scim-service-principal-object-id');
            scimServicePrincipalObjectIdElements.forEach(element => element.value = body.servicePrincipal.objectId);
            document.querySelector('#post-create-databricks-pat input.scim-connector-gallery-app-name').value = scimConnectorGalleryAppName;
            addToLog(`Created scim connector gallery app: ${scimConnectorGalleryAppName}...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.innerError.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while creating scim connector gallery app...');
    }
};
const postScimConnectorGalleryAppElement = document.querySelector('#post-scim-connector-gallery-app > button');
postScimConnectorGalleryAppElement.onclick = postScimConnectorGalleryApp;

// GET AAD Group
// findAADGroup needs aadGroupName
// returns groupId for getAppRoleAssignments and addGroupToSCIM
async function getAadGroups() {
    try {
        addToLog(`<br />Searching for aad groups...`);
        const graphAccessToken = document.querySelector('#get-aad-groups input.graph-access-token').value;
        const filterAadGroupDisplayName = document.querySelector('#get-aad-groups input#filter-display-name').value;
        if (!graphAccessToken || !filterAadGroupDisplayName) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to get aad groups...' },
                { value: filterAadGroupDisplayName, message: 'Search display name required to get aad groups...' },
            ]);
        }
        const response = await fetch(`${document.location.origin}/aadGroups?filterAadGroupDisplayName=${encodeURIComponent(filterAadGroupDisplayName)}`, {
            method: 'GET',
            headers: { 'X-Access-Token': graphAccessToken }
        })
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            const aadGroupIdsElement = document.querySelector('#aad-group-ids');
            aadGroupIdsElement.innerHTML = '';
            addToLog(`Found ${body.value.length} aad group${body.value.length === 1 ? '' : 's'}...`);
            body.value.forEach(({ id, displayName }, index) => {
                const inputElement = document.createElement('input');
                if (index === 0) {
                    inputElement.checked = true;
                }
                inputElement.type = 'radio';
                inputElement.id = `aadGroup${index}`;
                inputElement.name = `aadGroupId`
                inputElement.value = id;
                const labelElement = document.createElement('label');
                labelElement.for = `aadGroup${index}`;
                labelElement.innerText = displayName;
                aadGroupIdsElement.appendChild(document.createElement('br'));
                aadGroupIdsElement.appendChild(inputElement);
                aadGroupIdsElement.appendChild(labelElement);
                addToLog(`${displayName}: ${id}`);
            });
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while getting aad groups...');
    }
};
const getAadGroupsElement = document.querySelector('#get-aad-groups > button');
getAadGroupsElement.onclick = getAadGroups;

// GET Service Principal
// getServicePrincipal needs scimSPObjId
// returns appRoleId
async function getServicePrincipal() {
    try {
        addToLog(`<br />Fetching service principals...`);
        const graphAccessToken = document.querySelector('#get-service-principal input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#get-service-principal input.scim-service-principal-object-id').value;
        if(!graphAccessToken || !scimServicePrincipalObjectId) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to get service principals...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to get service principals...' },
            ]);
        }
        const response = await fetch(`${document.location.origin}/servicePrincipal?servicePrincipalId=${encodeURIComponent(scimServicePrincipalObjectId)}`, {
            method: 'GET',
            headers: { 'X-Access-Token': graphAccessToken }
        })
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            const appRoleIdsElement = document.querySelector('#app-role-ids');
            appRoleIdsElement.innerHTML = '';
            addToLog(`Found ${body.appRoles.filter(({ isEnabled }) => isEnabled).length} app role${body.appRoles.length === 1 ? '' : 's'}...`);
            body.appRoles.filter(({ isEnabled }) => isEnabled).forEach(({ displayName, id }, index) => {
                const inputElement = document.createElement('input');
                if (index === 0) {
                    inputElement.checked = true;
                }
                inputElement.type = 'radio';
                inputElement.id = `appRole${index}`;
                inputElement.name = `appRoleId`
                inputElement.value = id;
                const labelElement = document.createElement('label');
                labelElement.for = `appRole${index}`;
                labelElement.innerText = displayName;
                appRoleIdsElement.appendChild(document.createElement('br'));
                appRoleIdsElement.appendChild(inputElement);
                appRoleIdsElement.appendChild(labelElement);
                addToLog(`${displayName}: ${id}`);
            });
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while getting service principals...');
    }
}
const getServicePrincipalElement = document.querySelector('#get-service-principal > button');
getServicePrincipalElement.onclick = getServicePrincipal;

// POST Group to SCIM
// addGroupToSCIM needs scimSPObjId, groupId, and appRoleId
// returns nothing needed for future requests
async function postAadGroupToScim() {
    try {
        addToLog(`<br />Adding aad group to scim...`);
        const graphAccessToken = document.querySelector('#post-aad-group-to-scim input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#post-aad-group-to-scim input.scim-service-principal-object-id').value;
        const checkedAadGroupIdElement =  document.querySelector('#post-aad-group-to-scim #aad-group-ids>input:checked');
        const aadGroupId = checkedAadGroupIdElement && checkedAadGroupIdElement.value;
        const checkedAppRoleIdElement =  document.querySelector('#post-aad-group-to-scim #app-role-ids>input:checked');
        const appRoleId = checkedAppRoleIdElement && checkedAppRoleIdElement.value;
        if(!graphAccessToken || !scimServicePrincipalObjectId || !aadGroupId || !appRoleId) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to add aad group to scim...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to add aad group to scim...' },
                { value: aadGroupId, message: 'Aad group id required to add aad group to scim...'},
                { value: appRoleId, message: 'App role id required to add aad group to scim...'},
            ]);
        }
        const parameters = [
            { key: 'servicePrincipalId', value: scimServicePrincipalObjectId },
            { key: 'aadGroupId', value: aadGroupId },
            { key: 'appRoleId', value: appRoleId },
        ].map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
        const response = await fetch(`${document.location.origin}/aadGroupToScim?${parameters}`, {
            method: 'POST',
            headers: { 'X-Access-Token': graphAccessToken },
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 201) {
            addToLog('Aad group was successfully added to scim...');
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while adding aad group to scim...');
    }
}
const postAadGroupToScimElement = document.querySelector('#post-aad-group-to-scim > button');
postAadGroupToScimElement.onclick = postAadGroupToScim;

// POST Sync Job
// createSyncJob needs scimSPObjId
// returns jobId for validateCredentials, saveCredentials, startSyncJob, monitorJob
async function postSyncJob() {
    try {
        addToLog(`<br />Creating sync job...`);
        const graphAccessToken = document.querySelector('#post-sync-job input.graph-access-token').value;
        const jobTemplateId = document.querySelector('#post-sync-job input#job-template-id').value;
        const scimServicePrincipalObjectId = document.querySelector('#post-sync-job input.scim-service-principal-object-id').value;
        if(!graphAccessToken || !jobTemplateId || !scimServicePrincipalObjectId) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to create sync job...' },
                { value: jobTemplateId, message: 'Job template id required to create sync job...'},
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to create sync job...' },
            ]);
        }
        const response = await fetch(`${document.location.origin}/createSyncJob?syncJobTemplateId=${encodeURIComponent(jobTemplateId)}&servicePrincipalId=${encodeURIComponent(scimServicePrincipalObjectId)}`, {
            method: 'POST',
            headers: { 'X-Access-Token': graphAccessToken },
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 201) {
            const syncJobIdElements = document.querySelectorAll('input.sync-job-id');
            syncJobIdElements.forEach(element => element.value = body.id);
            addToLog(`Successfully created sync job ${body.id}...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while creating sync job...');
    }
}
const postSyncJobElement = document.querySelector('#post-sync-job > button');
postSyncJobElement.onclick = postSyncJob;

// POST Create Databricks PAT
async function postCreateDatabricksPat() {
    try {
        addToLog(`<br />Creating databricks pat...`);
        const databricksAccessToken = document.querySelector('#post-create-databricks-pat input.databricks-access-token').value;
        const databricksUrl = document.querySelector('#post-create-databricks-pat input.databricks-url').value;
        const galleryAppName = document.querySelector('#post-create-databricks-pat input.scim-connector-gallery-app-name').value;
        if(!databricksAccessToken || !databricksUrl || !galleryAppName) {
            return logMissingInputs([
                { value: databricksAccessToken, message: 'Databricks access token required to create databricks pat...' },
                { value: databricksUrl, message: 'Databricks url required to create databricks pat...'},
                { value: galleryAppName, message: 'Gallery app name required to create databricks pat...' },
            ]);
        }
        const response = await fetch(`${document.location.origin}/databricksPat?databricksUrl=${encodeURIComponent(databricksUrl)}&galleryAppName=${encodeURIComponent(galleryAppName)}`, {
            method: 'POST',
            headers: { 'X-Access-Token': databricksAccessToken },
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            const databricksPatElements = document.querySelectorAll('input.databricks-pat');
            databricksPatElements.forEach(element => element.value = body.token_value);
            const databricksUrlElements = document.querySelectorAll('input.databricks-url');
            databricksUrlElements.forEach(element => element.value = databricksUrl);
            addToLog(`Successfully created databricks PAT: ${body.token_value}...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while creating databricks pat...');
    }
}
const postCreateDatabricksPatElement = document.querySelector('#post-create-databricks-pat > button');
postCreateDatabricksPatElement.onclick = postCreateDatabricksPat;

// POST Validate Credentials
// validateCredentials needs scimSPObjId, jobId(, databricksUrl, and databricksPAT **from User)
// returns nothing needed for future requests
async function postValidateCredentials() {
    try {
        addToLog(`<br />Validating credentials...`);
        const graphAccessToken = document.querySelector('#post-validate-credentials input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#post-sync-job input.scim-service-principal-object-id').value;
        const syncJobId = document.querySelector('#post-validate-credentials input.sync-job-id').value;
        const databricksUrl = document.querySelector('#post-validate-credentials input.databricks-url').value;
        const databricksPat = document.querySelector('#post-validate-credentials input.databricks-pat').value;
        if(!graphAccessToken || !scimServicePrincipalObjectId || !syncJobId || !databricksUrl || !databricksPat) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to validate credentials...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to validate credentials...' },
                { value: syncJobId, message: 'Sync job id required to validate credentials...'},
                { value: databricksUrl, message: 'Databricks url required to validate credentials...'},
                { value: databricksPat, message: 'Databricks pat required to validate credentials...'},
            ]);
        }
        const parameters = [
            { key: 'servicePrincipalId', value: scimServicePrincipalObjectId },
            { key: 'syncJobId', value: syncJobId },
            { key: 'databricksUrl', value: databricksUrl },
        ].map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
        const response = await fetch(`${document.location.origin}/validateCredentials?${parameters}`, {
            method: 'POST',
            headers: { 'X-Access-Token': graphAccessToken, 'X-Databricks-Pat': databricksPat },
        });
        if (response.status === 204) {
            addToLog(`Successfully validated credentials...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while validating credentials...');
    }
}
const postValidateCredentialsElement = document.querySelector('#post-validate-credentials > button');
postValidateCredentialsElement.onclick = postValidateCredentials;

// PUT Save Credentials
// saveCredentials needs scimSPObjId, jobId(, databricksUrl, databricksPAT **from User)
// returns nothing needed for future requests
async function putSaveCredentials() {
    try {
        addToLog(`<br />Saving credentials...`);
        const graphAccessToken = document.querySelector('#put-save-credentials input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#put-save-credentials input.scim-service-principal-object-id').value;
        const databricksUrl = document.querySelector('#put-save-credentials input.databricks-url').value;
        const databricksPat = document.querySelector('#put-save-credentials input.databricks-pat').value;
        if(!graphAccessToken || !scimServicePrincipalObjectId || !databricksUrl || !databricksPat) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to save credentials...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to save credentials...' },
                { value: databricksUrl, message: 'Databricks url required to save credentials...'},
                { value: databricksPat, message: 'Databricks pat required to save credentials...'},
            ]);
        }
        const parameters = [
            { key: 'servicePrincipalId', value: scimServicePrincipalObjectId },
            { key: 'databricksUrl', value: databricksUrl },
        ].map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
        const response = await fetch(`${document.location.origin}/saveCredentials?${parameters}`, {
            method: 'PUT',
            headers: { 'X-Access-Token': graphAccessToken, 'X-Databricks-Pat': databricksPat },
        });
        if (response.status === 204) {
            addToLog(`Successfully saved credentials...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while saving credentials...');
    }
}
const putSaveCredentialsElement = document.querySelector('#put-save-credentials > button');
putSaveCredentialsElement.onclick = putSaveCredentials;

// POST Start Sync Job
// startSyncJob needs scimSPObjId and jobId
// returns nothing needed for future requests
async function postStartSyncJob() {
    try {
        addToLog(`<br />Starting sync job...`);
        const graphAccessToken = document.querySelector('#post-start-sync-job input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#post-start-sync-job input.scim-service-principal-object-id').value;
        const syncJobId = document.querySelector('#post-start-sync-job input.sync-job-id').value;
        if(!graphAccessToken || !scimServicePrincipalObjectId || !syncJobId) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to start sync job...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to start sync job...' },
                { value: syncJobId, message: 'Sync job id required to start sync job...'},
            ]);
        }
        const response = await fetch(`${document.location.origin}/startSyncJob?servicePrincipalId=${encodeURIComponent(scimServicePrincipalObjectId)}&syncJobId=${encodeURIComponent(syncJobId)}`, {
            method: 'POST',
            headers: { 'X-Access-Token': graphAccessToken },
        });
        if (response.status === 204) {
            addToLog(`Successfully started sync job...`);
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while starting sync job...');
    }
}
const postStartSyncJobElement = document.querySelector('#post-start-sync-job > button');
postStartSyncJobElement.onclick = postStartSyncJob;

// GET Monitor Job
// monitorJob needs scimSPObjId and jobId
// returns logged status
async function getSyncJobStatus() {
    try {
        addToLog(`<br /> Fetching status of sync job...`);
        const graphAccessToken = document.querySelector('#get-sync-job-status input.graph-access-token').value;
        const scimServicePrincipalObjectId = document.querySelector('#get-sync-job-status input.scim-service-principal-object-id').value;
        const syncJobId = document.querySelector('#get-sync-job-status input.sync-job-id').value;
        if(!graphAccessToken || !scimServicePrincipalObjectId || !syncJobId) {
            return logMissingInputs([
                { value: graphAccessToken, message: 'Graph access token required to get status of sync job...' },
                { value: scimServicePrincipalObjectId, message: 'Scim service principal object id required to get status of sync job...' },
                { value: syncJobId, message: 'Sync job id required to get status of sync job...'},
            ]);
        }
        const response = await fetch(`${document.location.origin}/syncJobStatus?servicePrincipalId=${encodeURIComponent(scimServicePrincipalObjectId)}&syncJobId=${encodeURIComponent(syncJobId)}`, {
            method: 'GET',
            headers: { 'X-Access-Token': graphAccessToken },
        });
        const contentType = response.headers.get('content-type');
        const body = contentType.includes('json') ? await response.json() : await response.text();
        if (response.status === 200) {
            addToLog(`Successfully fetched sync job status...`);
            const { lastSuccessfulExecution, lastSuccessfulExecutionWithExports, lastExecution } = body.status;
            if (!lastSuccessfulExecution && !lastSuccessfulExecutionWithExports && !lastExecution) {
                addToLog('No available last execution data...');
            } else {
                if (lastSuccessfulExecution) {
                    const { state, timeBegan, timeEnded } = lastSuccessfulExecution;
                    addToLog(`Last Successful Execution: {
                        state: ${state},
                        timeBegan: ${timeBegan},
                        timeEnded: ${timeEnded}
                    }`);
                }
                if (lastSuccessfulExecutionWithExports) {
                    const { state, timeBegan, timeEnded } = lastSuccessfulExecutionWithExports;
                    addToLog(`Last Successful Execution with Exports: {
                        state: ${state},
                        timeBegan: ${timeBegan},
                        timeEnded: ${timeEnded}
                    }`);
                }
                if (lastExecution) {
                    const { state, timeBegan, timeEnded } = lastExecution;
                    addToLog(`Last Execution: {
                        state: ${state},
                        timeBegan: ${timeBegan},
                        timeEnded: ${timeEnded}
                    }`);
                }
            }
        } else if (response.status === 400 || response.status === 404) {
            addToLog(response.statusText + ': ' + body.error.message);
        } else if (response.status === 401) {
            addToLog(response.statusText + ': ' + body.error.code);
        } else {
            addToLog(response.statusText + ': ' + body);
        }
    } catch (err) {
        console.error(err);
        addToLog('Error while fetching status of sync job...');
    }
}
const getSyncJobStatusElement = document.querySelector('#get-sync-job-status > button');
getSyncJobStatusElement.onclick = getSyncJobStatus;