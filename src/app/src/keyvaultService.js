const { SecretClient } = require('@azure/keyvault-secrets');
const msRestNodeAuth = require('@azure/ms-rest-nodeauth');
const azureIdentity = require('@azure/identity');
const Promise = require('bluebird');
const { keyvaultSettings } = require('../config');

class keyvaultService {
    // creates a new instance of the KeyvaultService class
    constructor(url, authType) {
        this.url = url;
        this.authType = authType;
    }

    // returns the latest version of the name's secret.
    async getSecret(name) {
        try {
            const { value: secret } = await this.client.getSecret(name);
            return secret;
        } catch (e) {
            throw new Error(`Unable to find secret ${name}`);
        }
    }

    // connect to the Keyvault client
    // AKS can take longer to spin up pod identity for the first pod, so
    //      we retry for up to 90 seconds
    async connect() {
        // set retry managed identity count
        const MAX_RETRIES = keyvaultSettings.CONNECTION_RETRIES;
        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                // use specified authentication type (either MI or CLI)
                const creds = this.authType === 'MI'
                    ? new azureIdentity.ManagedIdentityCredential()
                    : await msRestNodeAuth.AzureCliCredentials.create({ resource: 'https://vault.azure.net' });
                this.client = new SecretClient(this.url, creds);
                // test getSecret to validate successful Keyvault connection
                await this.getSecret('CosmosUrl');
                return true;
            } catch (e) {
                retries++;
                if (this.authType === 'MI' && retries < MAX_RETRIES) {
                    // wait 1 second and retry (continue while loop)
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                    throw new Error('Failed to connect to Keyvault with MI');
                }
            }
        }
    }
}

<<<<<<< HEAD
module.exports = keyvaultService;
=======
async function getKeyvaultSecrets(url, keys) {
    const keyvault = new keyvaultService(url, 'CLI');
    await keyvault.connect();
    return Promise.map(keys, async key => await keyvault.getSecret(key))
        .then(secrets => (
            secrets.map(secret => {
                if (!secret) { throw new Error('Missing Key Vault Secrets') }
                return secret;
            }).reduce((agg, secret, index) => ({ ...agg, [keys[index]]: secret}), {})
        ))
}

module.exports = {
    keyvaultService,
    getKeyvaultSecrets,
};
>>>>>>> Move GUI from spike/interfaces to app
