const Promise = require('bluebird');
const { SecretClient } = require('@azure/keyvault-secrets');
const azureIdentity = require('@azure/identity');
const { keyvaultSettings } = require('../../config');

class Keyvault {
    // creates a new instance of the Keyvault class
    constructor(url) {
        this.url = url;
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
    async connect() {
        // use CLI credentials
        const creds = new azureIdentity.AzureCliCredential();
        this.client = new SecretClient(this.url, creds);
        // test getSecret to validate successful Keyvault connection
        await this.getSecret(keyvaultSettings.CLIENT_ID_KEY); // eslint-disable-line no-await-in-loop
    }
}

async function getKeyvaultSecrets(url, keys) {
    const keyvault = new Keyvault(url);
    await keyvault.connect();
    return Promise.map(keys, (key) => keyvault.getSecret(key))
        .then((secrets) => (
            secrets.map((secret) => {
                if (!secret) { throw new Error('Missing Key Vault Secrets'); }
                return secret;
            }).reduce((agg, secret, index) => ({ ...agg, [keys[index]]: secret }), {})
        ));
}

module.exports = {
    Keyvault,
    getKeyvaultSecrets,
};
