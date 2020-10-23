const rewire = require('rewire');

const csvCallbacks = rewire('../../src/csv/syncCallbacks.js');
const cliProgress = require('cli-progress');
const { expect } = require('chai');
const chai = require('chai');
const sinon = require('sinon');
const spies = require('chai-spies');
const chaiHttp = require('chai-http');
const chaiAsPromised = require('chai-as-promised');
const { log, handleResponseErrors } = require('../../src/helpers');

chai.use(chaiHttp);
chai.use(spies);
chai.use(chaiAsPromised);

const accessToken = 'mockAccessToken';
const refreshToken = 'mockRefreshToken';
const objectId = 'mockObjectId';
const stepsStatus = 'mockStatus';
const aadId = 'mockAadId';
const progressMultiBar = new cliProgress.MultiBar({
    format: '{galleryAppName}: [{bar}] | {percentage}% | {value}/{total} Steps | {duration}s Elapsed',
}, cliProgress.Presets.legacy);
const progressBar = progressMultiBar.create(0, 0,'something' );

const params = {progressBar};
const tokenValue = 'mockTokenValue';
const userEmail = 'mockuser1@email.com';

let stubProgressBar;
let body;
beforeEach(() => {
    stubProgressBar = sinon.stub(progressBar, 'increment');
});
afterEach(() => {
    stubProgressBar.restore();
});

class Response {
    constructor(status, statusText) {
        this.body = body;
        this.status = status;
        this.statusText = statusText;
    }
    json() {
        return this.body;
    }
}

describe('validate postAccessToken Function', () => {
    body = { access_token: accessToken, refresh_token: refreshToken };
    const mockResponse = new Response();     

    it('should get access token and refresh access token for 200 status code', async () => {
        mockResponse.status = 200;
        mockResponse.statusText = 'success';

        const response = await csvCallbacks.postAccessToken(mockResponse);
        expect(response.accessToken).to.equal(accessToken);
        expect(response.refreshToken).to.equal(refreshToken);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        mockResponse.statusText = 'unauthorized';
        return expect(csvCallbacks.postAccessToken(mockResponse)).to.be.rejected;
    });
});

describe('validate postScimConnectorGalleryApp functions', () => {
    body = { servicePrincipal: { objectId }, application: { objectId } };
    const mockResponse = new Response();

    it('should get Service Principal Id for 201 status code', async () => {
        mockResponse.status = 201;

        const response = await csvCallbacks.postScimConnectorGalleryApp(mockResponse, params);
        expect(response.params.servicePrincipalId).to.equal(objectId);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postScimConnectorGalleryApp(mockResponse, '', '')).to.be.rejected;
    });
});

describe('validate getAadGroups functions', () => {
    body = { value: [{ id: aadId }] };
    const mockResponse = new Response();

    it('should get AAD Group Id for 200 status code', async () => {
        mockResponse.status = 200;

        const response = await csvCallbacks.getAadGroups(mockResponse, params);
        expect(response.params.aadGroupId).to.equal(aadId);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.getAadGroups(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postAddAadGroupToServicePrincipal function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 201 status code', async () => {
        mockResponse.status = 201;

        const response = await csvCallbacks.postAddAadGroupToServicePrincipal(mockResponse, params);
        expect(response.params).to.deep.equal({});
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postAddAadGroupToServicePrincipal(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postCreateServicePrincipalSyncJob function', () => {
    body = { id: objectId };
    const mockResponse = new Response();

    it('should get Sync Job Id for 201 status code', async () => {
        mockResponse.status = 201;

        const response = await csvCallbacks.postCreateServicePrincipalSyncJob(mockResponse, params);
        expect(response.params.syncJobId).to.equal(objectId);
    });

    it('should throw error for 400 status code', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postCreateServicePrincipalSyncJob(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postCreateDatabricksPat function', () => {
    body = { token_value: tokenValue };
    const mockResponse = new Response();

    it('should get Databricks token value for 200 status code', async () => {
        mockResponse.status = 200;

        const response = await csvCallbacks.postCreateDatabricksPat(mockResponse, params);
        expect(response.params.databricksPat).to.equal(tokenValue);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postCreateDatabricksPat(mockResponse, params)).to.be.rejected;
    });
});

describe('validate getUserForOwner function', () => {
    body = { value: [{ id: userEmail }] };
      const mockResponse = new Response();

    it('should get response for 200 status code', async () => {
        mockResponse.status = 200;

        const response1 = await csvCallbacks.getUserForOwner1(mockResponse, params);
        const response2 = await csvCallbacks.getUserForOwner2(mockResponse, params);
        expect(response1.params.directoryObjectId1).to.equal(userEmail);
        expect(response2.params.directoryObjectId2).to.equal(userEmail);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.getUserForOwner1(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postAddSPOwner function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const response1 = await csvCallbacks.postAddSPOwner1(mockResponse, params);
        const response2 = await csvCallbacks.postAddSPOwner2(mockResponse, params);
        expect(response1.params).to.deep.equal(body);
        expect(response2.params).to.deep.equal(body);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postAddSPOwner1(mockResponse, params)).to.be.rejected;
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = undefined;
        return expect(csvCallbacks.postAddSPOwner2(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postAddAppOwner function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const response1 = await csvCallbacks.postAddAppOwner1(mockResponse, params);
        const response2 = await csvCallbacks.postAddAppOwner2(mockResponse, params);
        expect(response1.params).to.deep.equal(body);
        expect(response2.params).to.deep.equal(body);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postAddSPOwner1(mockResponse, params)).to.be.rejected;
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = undefined;
        return expect(csvCallbacks.postAddSPOwner2(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postValidateServicePrincipalCredentials function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const response = await csvCallbacks.postValidateServicePrincipalCredentials(mockResponse, params);
        expect(response.params).to.deep.equal(body);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postValidateServicePrincipalCredentials(mockResponse, params)).to.be.rejected;
    });
});

describe('validate putSaveServicePrincipalCredentials function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const response = await csvCallbacks.putSaveServicePrincipalCredentials(mockResponse, params);
        expect(response.params).to.deep.equal(body);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.putSaveServicePrincipalCredentials(mockResponse, params)).to.be.rejected;
    });
});

describe('validate postStartServicePrincipalSyncJob function', () => {
    body = {};
    const mockResponse = new Response();

    it('should get response for 204 status code', async () => {
        mockResponse.status = 204;

        const response = await csvCallbacks.postStartServicePrincipalSyncJob(mockResponse, params);
        expect(response.params).to.deep.equal(body);
    });

    it('should throw error for other status codes', () => {
        mockResponse.status = 400;
        return expect(csvCallbacks.postStartServicePrincipalSyncJob(mockResponse, params)).to.be.rejected;
    });
});
