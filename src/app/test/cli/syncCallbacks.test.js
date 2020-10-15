const rewire = require('rewire');

const cliCallbacks = rewire('../../src/cli/syncCallbacks.js');
const { assert } = require('chai');
const { expect } = require('chai');
const chai = require('chai');
const sinon = require('sinon');
const spies = require('chai-spies');
const chaiHttp = require('chai-http');
const cliCallback = require('../../src/cli/syncCallbacks.js');
const chaiAsPromised = require('chai-as-promised');
const { postAccessToken } = require('@databricks-scim-automation/graph');
const { keepFetching, log } = require('../../src/helpers');
const { stub } = require('sinon');
const { response } = require('express');

chai.use(chaiHttp);
chai.use(spies);
chai.use(chaiAsPromised);

const accessToken = 'mockAccessToken';
const refreshToken = 'mockRefreshToken';
const objectId = 'mockObjectId';
const stepsStatus = 'mockStatus';
const aadId = 'mockAadId';
const params = 'something';
const tokenValue = 'mockTokenValue';

let logTable, body;
beforeEach ( () => {
    logTable = sinon.stub(log, 'table').returns(stepsStatus);
});
afterEach ( () => {
    logTable.restore();
});

class Response {
    constructor() {
        this.body = body;
    }
    status;
    statusText;
    json() {
        return this.body;
    }
};

describe('validate postAccessToken Function', () => {
    body = { access_token: accessToken, refresh_token: refreshToken };
    const mockResponse = new Response();

    it('should get access token and refresh access token for 200 status code', async () => {
        mockResponse.status = 200;
        mockResponse.statusText = 'success';

        const result = await cliCallbacks.postAccessToken(mockResponse);
        expect(result.accessToken).to.equal(accessToken);
        expect(result.refreshToken).to.equal(refreshToken);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        mockResponse.statusText = 'unauthorized';
        return expect(cliCallbacks.postAccessToken(mockResponse)).to.be.rejected;
    });
});

describe ('validate postScimConnectorGalleryApp functions', () => {
    body = { servicePrincipal : {objectId : objectId} };
    const mockResponse = new Response();

    it('should get Service Principal Id for 201 status code', async () => {
        mockResponse.status = 201;
    
        const result = await cliCallbacks.postScimConnectorGalleryApp(mockResponse, stepsStatus, params);
        expect(result.servicePrincipalId).to.equal(objectId);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postScimConnectorGalleryApp(mockResponse, '', '')).to.be.rejected;
    });
});

describe ('validate getAadGroups functions', () => {
    body = { value : [{id: aadId}] };
    const mockResponse = new Response();

    it('should get AAD Group Id for 200 status code', async () => {
        mockResponse.status = 200;

        const result = await cliCallbacks.getAadGroups(mockResponse, stepsStatus, params);
        expect(result.aadGroupId).to.equal(aadId);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.getAadGroups(mockResponse, stepsStatus, params)).to.be.rejected;
    });
});

describe ('validate postAddAadGroupToServicePrincipal function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 201 status code', async () => {
        mockResponse.status = 201;

        const result = await cliCallbacks.postAddAadGroupToServicePrincipal(mockResponse, stepsStatus);
        expect(result).to.deep.equal({});
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postAddAadGroupToServicePrincipal(mockResponse, stepsStatus)).to.be.rejected;
    });
});

describe ('validate postCreateServicePrincipalSyncJob function', () => {
    body = { id : objectId };
    const mockResponse = new Response();

    it('should get Sync Job Id for 201 status code', async () => {
        mockResponse.status = 201;

        const result = await cliCallbacks.postCreateServicePrincipalSyncJob(mockResponse, stepsStatus, params);
        expect(result.syncJobId).to.equal(objectId);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for 400 status code', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postCreateServicePrincipalSyncJob(mockResponse, stepsStatus, params)).to.be.rejected;
    });
});

describe ('validate postCreateDatabricksPat function', () => {
    body = { token_value : tokenValue };
    const mockResponse = new Response();

    it('should get Databricks token value for 200 status code', async () => {
        mockResponse.status = 200;

        const result = await cliCallbacks.postCreateDatabricksPat(mockResponse, stepsStatus, params);
        expect(result.databricksPat).to.equal(tokenValue);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postCreateDatabricksPat(mockResponse, stepsStatus, params)).to.be.rejected;
    });
});

describe ('validate postValidateServicePrincipalCredentials function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const result = await cliCallbacks.postValidateServicePrincipalCredentials(mockResponse, stepsStatus);
        expect(result).to.deep.equal(body);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postValidateServicePrincipalCredentials(mockResponse, stepsStatus)).to.be.rejected;
    });
});

describe ('validate putSaveServicePrincipalCredentials function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const result = await cliCallbacks.putSaveServicePrincipalCredentials(mockResponse, stepsStatus);
        expect(result).to.deep.equal(body);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.putSaveServicePrincipalCredentials(mockResponse, stepsStatus)).to.be.rejected;
    });
});

describe ('validate postStartServicePrincipalSyncJob function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const result = await cliCallbacks.postStartServicePrincipalSyncJob(mockResponse, stepsStatus);
        expect(result).to.deep.equal(body);
        expect(logTable.callCount).to.equal(1);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(cliCallbacks.postStartServicePrincipalSyncJob(mockResponse, stepsStatus)).to.be.rejected;
    });
});