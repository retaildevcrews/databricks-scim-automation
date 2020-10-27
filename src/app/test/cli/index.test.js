const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const Promise = require('bluebird');
const graph = require('@databricks-scim-automation/graph');
const signin = require('@databricks-scim-automation/signin');
const { expect } = require('chai');
const chai = require('chai');
const spies = require('chai-spies');
const helper = require('../../src/helpers/index.js');
const keyvault = require('../../src/services/keyvault');

const { keyvaultSettings } = require('../../config');
const { prompts, log } = require('../../src/helpers');

chai.use(spies);
chai.use(sinonChai);

const clientId = 'mockClientId';
const clientSecret = 'mockClientSecret';
const tenantId = 'mockTenantId';
const graphAuthCode = 'mockGraphAuthCode';
const databricksAuthCode = 'mockDatabricksAuthCode';

// Stub external function calls before importing index.js
const kv = sinon.stub(keyvault, 'getKeyvaultSecrets').resolves(
    {
        [keyvaultSettings.TENANT_ID_KEY]: tenantId,
        [keyvaultSettings.CLIENT_ID_KEY]: clientId,
        [keyvaultSettings.CLIENT_SECRET_KEY]: clientSecret,
    },
);
sinon.stub(process, 'exit');
const keepFetch = sinon.stub(helper, 'keepFetching').returns(() => {});

const startCli = rewire('../../src/cli');
const index = rewire('../../src/cli/index');
const syncCallbacks = require('../../src/cli/syncCallbacks.js');
const { getKeyvaultSecrets } = require('../../src/services/keyvault');

describe('CLI: Index functions', () => {
    describe('Validate startCli Function for CLI', () => {
        let userPrompts;
        let logs;
        let signIn;
        beforeEach(() => {
            signIn = sinon.stub(signin.SigninApp.prototype, 'start').callsFake(() => 1);
            userPrompts = sinon.stub(prompts, 'howToSignin');
            logs = sinon.stub(console, 'log');
        });
        afterEach(() => {
            logs.restore();
            userPrompts.restore();
            signIn.restore();
        });

        const keys = [
            keyvaultSettings.TENANT_ID_KEY,
            keyvaultSettings.CLIENT_ID_KEY,
            keyvaultSettings.CLIENT_SECRET_KEY,
        ];

        it('should call getKeyvaultSecrets and prompts to signin', async () => {
            await startCli();
            expect(getKeyvaultSecrets).to.have.been.called;
            expect(getKeyvaultSecrets).to.have.been.calledWith(process.env.KEYVAULT_URL, keys);
            sinon.assert.called(prompts.howToSignin);
        });
    });

    describe('Validate startSync Function for CLI', async () => {
        let logs; let errorLog; let getAccessToken; let callback; let userPrompts; let SPJobStatus; let mapSeries; let
    logTable;
        const startSync = index.__get__('startSync');
        const secrets = { clientSecret, clientId, tenantId };

        beforeEach(() => {
            getAccessToken = sinon.stub(graph, 'postAccessToken').resolves(graphAuthCode);
            logs = sinon.stub(console, 'log');
            errorLog = sinon.stub(console, 'error');
            logTable = sinon.stub(log, 'initialTable');
            SPJobStatus = sinon.stub(graph, 'getServicePrincipalSyncJobStatus').resolves({});
            callback = sinon.stub(syncCallbacks, 'postAccessToken').resolves(graphAuthCode);
            mapSeries = sinon.stub(Promise, 'mapSeries');
        });
        afterEach(() => {
            getAccessToken.restore();
            callback.restore();
            SPJobStatus.restore();
            mapSeries.restore();
            logs.restore();
            logTable.restore();
            errorLog.restore();
        });

        it('should call postAccessToken twice', async () => {
            userPrompts = sinon.stub(prompts, 'getUserInputs').resolves({ databricksUrl: 'https://adb-*.*.azuredatabricks.net' });
            await startSync(secrets, { graphAuthCode, databricksAuthCode });
            expect(getAccessToken).to.have.been.calledTwice;
            userPrompts.restore();
        });

        it('should log initial table once', async () => {
            userPrompts = sinon.stub(prompts, 'getUserInputs').resolves({ databricksUrl: 'https://adb-*.*.azuredatabricks.net' });
            await startSync(secrets, { graphAuthCode, databricksAuthCode });
            expect(logTable).to.have.been.calledOnce;
            userPrompts.restore();
        });

        it('should call getServicePrincipalSyncJobStatus', async () => {
            userPrompts = sinon.stub(prompts, 'getUserInputs').resolves({ databricksUrl: 'https://adb-*.*.azuredatabricks.net' });
            await startSync(secrets, { graphAuthCode, databricksAuthCode });
            expect(SPJobStatus).to.have.been.called;
            userPrompts.restore();
        });

        it('should throw error for invalid databricks url', async () => {
            userPrompts = sinon.stub(prompts, 'getUserInputs').resolves({ databricksUrl: 'https://mockurl.com' });
            await startSync(secrets, { graphAuthCode, databricksAuthCode });
            expect(errorLog).to.have.been.called;
        });
    });
});

kv.restore();
keepFetch.restore();
