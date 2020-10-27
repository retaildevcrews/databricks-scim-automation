const rewire = require('rewire');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const Promise = require('bluebird');
const cliProgress = require('cli-progress');
const graph = require('@databricks-scim-automation/graph');
const signin = require('@databricks-scim-automation/signin');
const { expect, assert } = require('chai');
const chai = require('chai');
const spies = require('chai-spies');
const helper = require('../../src/helpers/index.js');
const keyvault = require('../../src/services/keyvault');
const syncCallbacks = require('../../src/csv/syncCallbacks.js');

const { keyvaultSettings } = require('../../config');
const {
    prompts,
    log,
} = require('../../src/helpers');

chai.use(spies);
chai.use(sinonChai);

const clientId = 'mockClientId';
const clientSecret = 'mockClientSecret';
const tenantId = 'mockTenantId';
const graphAuthCode = 'mockGraphAuthCode';
const databricksAuthCode = 'mockDatabricksAuthCode';
const graphAccessToken = 'mockGraphAccessToken';
const databricksAccessToken = 'mockDatabricksAccessToken';
const galleryAppName = 'mockGalleryApp';
const filterAadGroupDisplayName = 'mockAadGroup';
const ownerEmail1 = 'mockOwner1@email.com';
const ownerEmail2 = 'mockOwner2@email.com';
const databricksUrl = 'https://adb-123.11.azuredatabricks.net/';
const invalidDatabricksUrl = 'https://123.11.databricks.net/';
const validCsvLine = { csvRows: [`${galleryAppName}, ${filterAadGroupDisplayName}, ${ownerEmail1}, ${ownerEmail2}, ${databricksUrl}`] };
const invalidCsvLineSameOwner = { csvRows: [`${galleryAppName}, ${filterAadGroupDisplayName}, ${ownerEmail1}, ${ownerEmail1}, ${databricksUrl}`] };
const invalidCsvLineNoAppName = { csvRows: [`'', ${filterAadGroupDisplayName}, ${ownerEmail1}, ${ownerEmail2}, ${databricksUrl}`] };
const invalidCsvLineDBUrlNotAccepted = { csvRows: [`${galleryAppName}, ${filterAadGroupDisplayName}, ${ownerEmail1}, ${ownerEmail2}, ${invalidDatabricksUrl}`] };
const invalidCsvLineInconsistentValues = { csvRows: [`${filterAadGroupDisplayName}, ${ownerEmail1}, ${invalidDatabricksUrl}`] };
const sharedParams = {
    galleryAppTemplateId: galleryAppName,
    syncJobTemplateId: '',
    graphAccessToken,
    graphRefreshAccessToken: graphAccessToken,
    databricksAccessToken,
    databricksRefreshAccessToken: databricksAccessToken,
};

// Stub external function calls before importing index.js
const kv = sinon.stub(keyvault, 'getKeyvaultSecrets').resolves(
    {
        [keyvaultSettings.TENANT_ID_KEY]: tenantId,
        [keyvaultSettings.CLIENT_ID_KEY]: clientId,
        [keyvaultSettings.CLIENT_SECRET_KEY]: clientSecret,
    },
);
const getCSV = sinon.stub(helper, 'getCsvInputs').returns(validCsvLine);
const isCSV = sinon.stub(helper, 'isCsvFile').returns(true);

const startCSV = rewire('../../src/csv');
const index = rewire('../../src/csv/index');
const { getKeyvaultSecrets } = require('../../src/services/keyvault');

describe('CSV: Index functions', () => {
    describe('Validate startCsv Function for CSV', () => {
        let userPrompts;
        let logs;
        let errorLog;
        let signIn;

        beforeEach(() => {
            userPrompts = sinon.stub(prompts, 'howToSignin');
            signIn = sinon.stub(signin.SigninApp.prototype, 'start').callsFake(() => 1);
            logs = sinon.stub(console, 'log');
            errorLog = sinon.stub(console, 'error');
        });
        afterEach(() => {
            userPrompts.restore();
            signIn.restore();
            logs.restore();
            errorLog.restore();
        });

        const keys = [
            keyvaultSettings.TENANT_ID_KEY,
            keyvaultSettings.CLIENT_ID_KEY,
            keyvaultSettings.CLIENT_SECRET_KEY,
        ];

        it('should call getKeyvaultSecrets and prompts to signin', async () => {
            await startCSV('syncs.csv');
            expect(getKeyvaultSecrets).to.have.been.called;
            expect(getKeyvaultSecrets).to.have.been.calledWith(process.env.KEYVAULT_URL, keys);
            sinon.assert.called(prompts.howToSignin);
        });

        it('should throw error for same owner emails', async () => {
            getCSV.returns(invalidCsvLineSameOwner);
            await startCSV('syncs.csv');
            expect(errorLog).to.have.been.called;
        });

        it('should throw error for empty Gallery App Name', async () => {
            getCSV.returns(invalidCsvLineNoAppName);
            await startCSV('syncs.csv');
            expect(errorLog).to.have.been.called;
        });

        it('should throw error for invalid Databricks Url', async () => {
            getCSV.returns(invalidCsvLineDBUrlNotAccepted);
            await startCSV('syncs.csv');
            expect(errorLog).to.have.been.called;
        });

        it('should throw error for inconsistent values with headers', async () => {
            getCSV.returns(invalidCsvLineInconsistentValues);
            await startCSV('syncs.csv');
            expect(errorLog).to.have.been.called;
        });
    });

    describe('Validate startSync Function for CSV', () => {
        let logs; let errorLog; let getAccessToken; let callback; let createFile; let mapSeries; let logTable;
        const startSync = index.__get__('startSync');
        const secrets = { clientSecret, clientId, tenantId };

        beforeEach(() => {
            getAccessToken = sinon.stub(graph, 'postAccessToken').resolves(graphAuthCode);
            logs = sinon.stub(console, 'log');
            errorLog = sinon.stub(console, 'error');
            logTable = sinon.stub(log, 'initialTable');
            callback = sinon.stub(syncCallbacks, 'postAccessToken').resolves(graphAuthCode);
            mapSeries = sinon.stub(Promise, 'all');
            createFile = sinon.stub(helper, 'createFile');
        });
        afterEach(() => {
            getAccessToken.restore();
            callback.restore();
            mapSeries.restore();
            logs.restore();
            logTable.restore();
            errorLog.restore();
            createFile.restore();
        });

        it('should call postAccessToken twice', async () => {
            await startSync(secrets, validCsvLine, { graphAuthCode, databricksAuthCode });
            expect(getAccessToken).to.have.been.calledTwice;
        });
    });

    describe('Validate promisfySyncCall Function for CSV', () => {
        let mapSeries;
        let mockProgressBar;
        const promisfySyncCall = index.__get__('promisfySyncCall');
        const progressMultiBar = index.__get__('progressMultiBar');
        const mockProgressMultiBar = new cliProgress.MultiBar({
            format: '',
        }, cliProgress.Presets.legacy);

        beforeEach(() => {
            mapSeries = sinon.stub(Promise, 'mapSeries').resolves('OK');
            mockProgressBar = sinon.stub(progressMultiBar, 'create').returns(mockProgressMultiBar.create(0, 0, ''));
        });
        afterEach(() => {
            mapSeries.restore();
            mockProgressBar.restore();
        });

        it('should return sync result', async () => {
            const syncResult = await promisfySyncCall(validCsvLine.csvRows[0], sharedParams);
            assert.equal(syncResult, 'OK');
        });

        it('should create Progressbar', async () => {
            await promisfySyncCall(validCsvLine.csvRows[0], sharedParams);
            expect(mockProgressBar).to.have.been.called;
        });
    });
});

kv.restore();
getCSV.restore();
isCSV.restore();
