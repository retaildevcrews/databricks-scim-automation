const rewire = require('rewire');

const startCli = rewire('../../src/cli');
const keyVault  = rewire('../../src/services/keyVault.js');
const cli = rewire('../../src/cli/index.js');
const { assert } = require('chai');
const { expect } = require('chai');
const chai = require('chai');
const spies = require('chai-spies');
const chaiHttp = require('chai-http');
const index = require('../../src/cli/index.js');
const sinon = require('sinon');

chai.use(chaiHttp);
chai.use(spies);

const clientIdKey = 'mockClientIdKey';
const clientSecretKey = 'mockClientSecretKey';
const tenantIdKey = 'mockTenantIdKey';
const clientId = 'mockClientId';
const clientSecret = 'mockClientSecret';
const tenantId = 'mockTenantId';

describe('Validate startCli Function', async () => {
    const keys = [
        clientIdKey,
        tenantIdKey,
        clientSecretKey,
    ];

    const values = {
        tenantId : tenantId,
        clientId : clientId,
        clientSecret : clientSecret,
    };

    //const spy = chai.spy();
    //startCli.__set__('getKeyvaultSecrets', spy);

    let logTable;
    beforeEach ( () => {
        logTable = sinon.stub(keyVault, 'getKeyvaultSecrets').resolves(values);
        sinon.spy(console, 'log');
    });
    afterEach ( () => {
        logTable.restore();
    });

    it('should call getKeyvaultSecrets', async () => {

        const result = await startCli();
        expect(console.log).to.be.called;
        expect(logTable.callCount).to.equal(1);
        //console.log(result);
        //expect(spy).to.have.been.called();
        //expect(spy).to.have.been.called.with(keys);
    });
});