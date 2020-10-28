const rewire = require('rewire');

const cliCallbacks = rewire('../../src/cli/syncCallbacks.js');
const { expect } = require('chai');
const chai = require('chai');
const sinon = require('sinon');
const spies = require('chai-spies');
const chaiHttp = require('chai-http');
const chaiAsPromised = require('chai-as-promised');
const { log } = require('../../src/helpers');

chai.use(chaiHttp);
chai.use(spies);
chai.use(chaiAsPromised);

const accessToken = 'mockAccessToken';
const refreshToken = 'mockRefreshToken';
const objectId = 'mockObjectId';
const stepsStatus = 'mockStatus';
const aadId = 'mockAadId';
const params = 'mockParams';
const tokenValue = 'mockTokenValue';
const userEmail = 'mockuser1@email.com';

let logTable;
let body;
beforeEach(() => {
    logTable = sinon.stub(log, 'table').returns(stepsStatus);
});
afterEach(() => {
    logTable.restore();
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

describe('CLI: syncCallback functions', () => {
    describe('validate postAccessToken Function for CLI', () => {
        body = { access_token: accessToken, refresh_token: refreshToken };
        const mockResponse = new Response();

        it('should get access token and refresh access token for 200 status code', async () => {
            mockResponse.status = 200;
            mockResponse.statusText = 'success';

            const response = await cliCallbacks.postAccessToken(mockResponse);
            expect(response.accessToken).to.equal(accessToken);
            expect(response.refreshToken).to.equal(refreshToken);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            mockResponse.statusText = 'unauthorized';
            return expect(cliCallbacks.postAccessToken(mockResponse)).to.be.rejected;
        });
    });

    describe('validate postScimConnectorGalleryApp functions for CLI', () => {
        body = { servicePrincipal: { objectId }, application: { objectId } };
        const mockResponse = new Response();

        it('should get Service Principal Id for 201 status code', async () => {
            mockResponse.status = 201;

            const response = await cliCallbacks.postScimConnectorGalleryApp(mockResponse, stepsStatus, params);
            expect(response.servicePrincipalId).to.equal(objectId);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postScimConnectorGalleryApp(mockResponse, '', '')).to.be.rejected;
        });
    });

    describe('validate getAadGroups functions for CLI', () => {
        body = { value: [{ id: aadId }] };
        const mockResponse = new Response();

        it('should get AAD Group Id for 200 status code', async () => {
            mockResponse.status = 200;

            const response = await cliCallbacks.getAadGroups(mockResponse, stepsStatus, params);
            expect(response.aadGroupId).to.equal(aadId);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.getAadGroups(mockResponse, stepsStatus, params)).to.be.rejected;
        });
    });

    describe('validate postAddAadGroupToServicePrincipal function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 201 status code', async () => {
            mockResponse.status = 201;

            const response = await cliCallbacks.postAddAadGroupToServicePrincipal(mockResponse, stepsStatus);
            expect(response).to.deep.equal({});
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postAddAadGroupToServicePrincipal(mockResponse, stepsStatus)).to.be.rejected;
        });
    });

    describe('validate postCreateServicePrincipalSyncJob function for CLI', () => {
        body = { id: objectId };
        const mockResponse = new Response();

        it('should get Sync Job Id for 201 status code', async () => {
            mockResponse.status = 201;

            const response = await cliCallbacks.postCreateServicePrincipalSyncJob(mockResponse, stepsStatus, params);
            expect(response.syncJobId).to.equal(objectId);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for 400 status code', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postCreateServicePrincipalSyncJob(mockResponse, stepsStatus, params)).to.be.rejected;
        });
    });

    describe('validate postCreateDatabricksPat function for CLI', () => {
        body = { token_value: tokenValue };
        const mockResponse = new Response();

        it('should get Databricks token value for 200 status code', async () => {
            mockResponse.status = 200;

            const response = await cliCallbacks.postCreateDatabricksPat(mockResponse, stepsStatus, params);
            expect(response.databricksPat).to.equal(tokenValue);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postCreateDatabricksPat(mockResponse, stepsStatus, params)).to.be.rejected;
        });
    });

    describe('validate getUserForOwner function for CLI', () => {
        body = { value: [{ id: userEmail }] };
        const mockResponse = new Response();

        it('should get response for 200 status code', async () => {
            mockResponse.status = 200;

            const response1 = await cliCallbacks.getUserForOwner1(mockResponse, stepsStatus, params);
            const response2 = await cliCallbacks.getUserForOwner2(mockResponse, stepsStatus, params);
            expect(response1.directoryObjectId1).to.equal(userEmail);
            expect(response2.directoryObjectId2).to.equal(userEmail);
            expect(logTable.callCount).to.equal(2);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.getUserForOwner1(mockResponse, stepsStatus, params)).to.be.rejected;
        });
    });

    describe('validate postAddSPOwner function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 204 status code', async () => {
            mockResponse.status = 204;

            const response1 = await cliCallbacks.postAddSPOwner1(mockResponse, stepsStatus);
            const response2 = await cliCallbacks.postAddSPOwner2(mockResponse, stepsStatus);
            expect(response1).to.deep.equal(body);
            expect(response2).to.deep.equal(body);
            expect(logTable.callCount).to.equal(2);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postAddSPOwner1(mockResponse, stepsStatus)).to.be.rejected;
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = undefined;
            return expect(cliCallbacks.postAddSPOwner2(mockResponse, stepsStatus)).to.be.rejected;
        });
    });

    describe('validate postAddAppOwner function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 204 status code', async () => {
            mockResponse.status = 204;

            const response1 = await cliCallbacks.postAddAppOwner1(mockResponse, stepsStatus);
            const response2 = await cliCallbacks.postAddAppOwner2(mockResponse, stepsStatus);
            expect(response1).to.deep.equal(body);
            expect(response2).to.deep.equal(body);
            expect(logTable.callCount).to.equal(2);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postAddSPOwner1(mockResponse, stepsStatus)).to.be.rejected;
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = undefined;
            return expect(cliCallbacks.postAddSPOwner2(mockResponse, stepsStatus)).to.be.rejected;
        });
    });

    describe('validate postValidateServicePrincipalCredentials function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 204 status code', async () => {
            mockResponse.status = 204;

            const response = await cliCallbacks.postValidateServicePrincipalCredentials(mockResponse, stepsStatus);
            expect(response).to.deep.equal(body);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postValidateServicePrincipalCredentials(mockResponse, stepsStatus)).to.be.rejected;
        });
    });

    describe('validate putSaveServicePrincipalCredentials function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 204 status code', async () => {
            mockResponse.status = 204;

            const response = await cliCallbacks.putSaveServicePrincipalCredentials(mockResponse, stepsStatus);
            expect(response).to.deep.equal(body);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.putSaveServicePrincipalCredentials(mockResponse, stepsStatus)).to.be.rejected;
        });
    });

    describe('validate postStartServicePrincipalSyncJob function for CLI', () => {
        body = {};
        const mockResponse = new Response();

        it('should get response for 204 status code', async () => {
            mockResponse.status = 204;

            const response = await cliCallbacks.postStartServicePrincipalSyncJob(mockResponse, stepsStatus);
            expect(response).to.deep.equal(body);
            expect(logTable.callCount).to.equal(1);
        });

        it('should throw error for other status codes', () => {
            mockResponse.status = 400;
            return expect(cliCallbacks.postStartServicePrincipalSyncJob(mockResponse, stepsStatus)).to.be.rejected;
        });
    });
});
