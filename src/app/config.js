const keyvaultSettings = {
    CONNECTION_RETRIES: 90,
    TENANT_ID_KEY: 'TenantID',
    CLIENT_ID_KEY: 'AppClientID',
    CLIENT_SECRET_KEY: 'AppClientSecret',
};

const tokenSettings = {
    GRAPH_SCOPE: 'https://graph.microsoft.com/mail.read',
    DATABRICKS_SCOPE: '2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/user_impersonation',
};

const loginTypes = {
    GRAPH_LOGIN: 'Graph authcode',
    DATABRICKS_LOGIN: 'Databricks authcode',
};

const csvAppSyncInterval = {
    DELAY_MS: 1500,
};

const databricksPATLife = {
    TIME_SEC: 31556952,
};

module.exports = {
 keyvaultSettings, tokenSettings, loginTypes, csvAppSyncInterval, databricksPATLife,
};
