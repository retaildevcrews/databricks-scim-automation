const url = require('url');
const keyvaultService = require('../../services/keyvault');
const { keyvaultSettings } = require('../../../config');

async function getKeyvaultSecrets(req, res) {
    try {
        const { query } = url.parse(req.url, true);
        const keyvaultUrl = query.url === 'default' ? process.env.KEYVAULT_URL : query.url;
        const keys = [
            keyvaultSettings.TENANT_ID_KEY,
            keyvaultSettings.CLIENT_ID_KEY,
            keyvaultSettings.CLIENT_SECRET_KEY,
        ];
        const secrets = await keyvaultService.getKeyvaultSecrets(keyvaultUrl, keys);
        res.set('Content-Type', 'application/json').status(200).send(JSON.stringify(secrets));
    } catch(err) {
        const errorMessage = 'Error fetching key vault secrets';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

module.exports = { getKeyvaultSecrets };