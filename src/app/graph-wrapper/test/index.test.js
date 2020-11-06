const rewire = require('rewire');

const graph = rewire('../index.js');
const { assert } = require('chai');
const { expect } = require('chai');
const chai = require('chai');
const spies = require('chai-spies');
const chaiHttp = require('chai-http');
const get = require('lodash.get');
const index = require('../index.js');
const { databricksPATLife } = require('../../config');

chai.use(chaiHttp);
chai.use(spies);

const tenantId = 'mock-tenant-id';
const clientId = 'mock-client-id';
const clientSecret = 'mock-client-secret';
const scope = 'https://graph.microsoft.com/mail.read';
const databricksUrl = 'https://adb-11222222.10.azuredatabricks.net/';
const filterAadGroupDisplayName = 'mockAADGroup';
const galleryAppName = 'mockGalleryApp';
const galleryAppTemplateId = 'mockGalleryTemplateId';
const syncJobTemplateId = 'mockSyncJobTemplateId';
const graphAccessToken = 'mockGraphAccessToken';
const databricksAccessToken = 'mockDatabricksAccessToken';
const secrets = { tenantId, clientId, clientSecret };
const servicePrincipalId = 'mockServicePrincipalId';
const aadGroupId = 'mockAADGroupId';
const appRoleId = 'mockAppRoleId';
const syncJobId = 'mockSyncJobId';
const databricksPat = 'mockDatabricksPat';
const graphAuthCode = 'mockGraphAuthCode';
const directoryObjectId1 = 'mockDirectoryObjectId1';
const directoryObjectId2 = 'mockDirectoryObjectId2';
const ownerEmail1 = 'mockOwner1@Email1.com';
const ownerEmail2 = 'mockOwner2@Email2.com';
const applicationId = 'mockApplicationId';

describe('Validate AccessToken', () => {
    const spy = chai.spy();
    graph.__set__('getQueryParams', spy);
    const queryParams = [
        { key: 'client_id', value: clientId },
        { key: 'scope', value: scope },
        { key: 'redirect_uri', value: 'http://localhost:8000' },
        { key: 'grant_type', value: 'authorization_code' },
        { key: 'client_secret', value: clientSecret },
        { key: 'code', value: graphAuthCode },
    ];

    it('should call postAccessToken with required parameters', (done) => {
    graph.postAccessToken({
                ...secrets,
                host: 'localhost:8000',
                code: graphAuthCode,
                scope,
            });

    expect(spy).to.have.been.called();
    expect(spy).to.have.been.called.with(queryParams);
    done();
    });

    it('should call postRefreshAccessToken with required parameters', (done) => {
        graph.postRefreshAccessToken({
                    ...secrets,
                    host: 'localhost:8000',
                    code: graphAuthCode,
                    scope,
                });

    expect(spy).to.have.been.called();
    expect(spy).to.have.been.called.with(queryParams);
    done();
    });
});

describe('Get Origin URL', () => {
    const expectedResult = 'http://localhost:8000';
    it('should get origin url with no origin provided', () => {
        const origin = '';
        const host = 'localhost:8000';
        const result = index.getOriginUrl({ origin, host });
        assert.equal(result, expectedResult);
    });

    it('should get origin url with origin provided', () => {
        const origin = 'http://localhost:8000';
        const host = '';
        const result = index.getOriginUrl({ origin, host });
        assert.equal(result, expectedResult);
    });
});

describe('Get Redirect Login Url', () => {
    it('should get origin url with client id and tenant id', () => {
        const origin = '';
        const host = 'localhost:8000';
        const result = index.getRedirectLoginUrl({
            origin, host, tenantId, clientId,
        });
        expect(result).to.include.string(tenantId);
        expect(result).to.include.string(clientId);
    });
});

describe('Validate Databricks & Graph API Calls', () => {
    const spiedFetch = chai.spy();
    graph.__set__('fetch', spiedFetch);

    it('should call postCreateDatabricksPat with required parameters', (done) => {
        graph.postCreateDatabricksPat({ databricksAccessToken, databricksUrl, galleryAppName });
        const databricksOrgId = get({ match: databricksUrl.match(/adb-\d+/) }, 'match[0]', '').split('-')[1];

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`${databricksUrl}api/2.0/token/create`);
        expect(spiedFetch).to.have.been.called.with({
            agent: false,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${databricksAccessToken}`,
                'X-Databricks-Org-Id': databricksOrgId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lifetime_seconds: databricksPATLife.TIME_SEC, comment: `SCIM Connector App - ${galleryAppName}` }),
        });
        done();
    });

    it('should call postScimConnectorGalleryApp with required parameters', (done) => {
        graph.postScimConnectorGalleryApp({ graphAccessToken, galleryAppTemplateId, galleryAppName });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/applicationTemplates/${galleryAppTemplateId}/instantiate`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
            body: JSON.stringify({ displayName: galleryAppName }),
        });
        done();
    });

    it('should call getAadGroups with required parameters', (done) => {
        graph.getAadGroups({ graphAccessToken, filterAadGroupDisplayName });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/groups?filter=displayname+eq+'${filterAadGroupDisplayName}'`);
        expect(spiedFetch).to.have.been.called.with({
            headers: { Authorization: `Bearer ${graphAccessToken}` },
        });
        done();
    });

    it('should call postAddAadGroupToServicePrincipal with required parameters', (done) => {
        graph.postAddAadGroupToServicePrincipal({
            graphAccessToken, servicePrincipalId, aadGroupId, appRoleId,
            });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/appRoleAssignments`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'POST',
            headers: {
                Authorization: `Bearer ${graphAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resourceId: servicePrincipalId,
                principalId: aadGroupId,
                appRoleId,
            }),
        });
        done();
    });

    it('should call postCreateServicePrincipalSyncJob with required parameters', (done) => {
        graph.postCreateServicePrincipalSyncJob({ graphAccessToken, servicePrincipalId, syncJobTemplateId });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'POST',
            headers: {
                Authorization: `Bearer ${graphAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ templateId: syncJobTemplateId }),
        });
        done();
    });

    it('should call postValidateServicePrincipalCredentials with required parameters', (done) => {
        graph.postValidateServicePrincipalCredentials({
            graphAccessToken, servicePrincipalId, syncJobId, databricksUrl, databricksPat,
        });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}/validateCredentials`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'POST',
            headers: {
                Authorization: `Bearer ${graphAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                credentials: [
                    { key: 'BaseAddress', value: `${databricksUrl}api/2.0/preview/scim` },
                    { key: 'SecretToken', value: databricksPat },
                ],
            }),
        });
        done();
    });

    it('should call putSaveServicePrincipalCredentials with required parameters', (done) => {
        graph.putSaveServicePrincipalCredentials({
            graphAccessToken, servicePrincipalId, databricksUrl, databricksPat,
        });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/secrets`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${graphAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: [
                    { key: 'BaseAddress', value: `${databricksUrl}api/2.0/preview/scim` },
                    { key: 'SecretToken', value: databricksPat },
                ],
            }),
        });
        done();
    });

    it('should call postStartServicePrincipalSyncJob with required parameters', (done) => {
        graph.postStartServicePrincipalSyncJob({ graphAccessToken, servicePrincipalId, syncJobId });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}/start`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'POST',
            headers: { Authorization: `Bearer ${graphAccessToken}` },
        });
        done();
    });

    it('should call getServicePrincipalSyncJobStatus with required parameters', (done) => {
        graph.getServicePrincipalSyncJobStatus({ graphAccessToken, servicePrincipalId, syncJobId });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/synchronization/jobs/${syncJobId}`);
        expect(spiedFetch).to.have.been.called.with({
            method: 'GET',
            headers: { Authorization: `Bearer ${graphAccessToken}` },
        });
        done();
    });

    it('should call getServicePrincipal with required parameters', (done) => {
        graph.getServicePrincipal({ graphAccessToken, servicePrincipalId });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${graphAccessToken}` },
        });
        done();
    });

    it('should call getUserForOwner1 with required parameters', (done) => {
        graph.getUserForOwner1({ graphAccessToken, ownerEmail1 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/users?$filter=startswith(userPrincipalName,'${ownerEmail1}')`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
        });
        done();
    });

    it('should call getUserForOwner2 with required parameters', (done) => {
        graph.getUserForOwner2({ graphAccessToken, ownerEmail2 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/users?$filter=startswith(userPrincipalName,'${ownerEmail2}')`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
        });
        done();
    });

    it('should call postAddSPOwner1 with required parameters', (done) => {
        graph.postAddSPOwner1({ graphAccessToken, servicePrincipalId, directoryObjectId1 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/owners/$ref`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/beta/directoryObjects/${directoryObjectId1}` }),
        });
        done();
    });

    it('should call postAddSPOwner2 with required parameters', (done) => {
        graph.postAddSPOwner2({ graphAccessToken, servicePrincipalId, directoryObjectId2 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/owners/$ref`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/beta/directoryObjects/${directoryObjectId2}` }),
        });
        done();
    });

    it('should call postAddAppOwner1 with required parameters', (done) => {
        graph.postAddAppOwner1({ graphAccessToken, applicationId, directoryObjectId1 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/applications/${applicationId}/owners/$ref`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/beta/directoryObjects/${directoryObjectId1}` }),
        });
        done();
    });

    it('should call postAddAppOwner2 with required parameters', (done) => {
        graph.postAddAppOwner2({ graphAccessToken, applicationId, directoryObjectId2 });

        expect(spiedFetch).to.have.been.called();
        expect(spiedFetch).to.have.been.called.with(`https://graph.microsoft.com/beta/applications/${applicationId}/owners/$ref`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${graphAccessToken}`,
            },
            body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/beta/directoryObjects/${directoryObjectId2}` }),
        });
        done();
    });
});
