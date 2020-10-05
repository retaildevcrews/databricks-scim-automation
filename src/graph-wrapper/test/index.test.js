const assert = require('chai').assert;
const expect = require('chai').expect;
const index = require('../index.js');
const fetchMock = require('fetch-mock');

const tenantId = '1234-3333-3333';
const clientId = '1111-2222-2222';
const clientSecret = '1111-2222-3333';
const scope = 'https://graph.microsoft.com/mail.read';
const databricksUrl = 'https://adb-123.11.azuredatabricks.net/';
const filterAadGroupDisplayName = 'testAADGroup';
const galleryAppName = 'test';
const secrets = { tenantId, clientId, clientSecret };
const sharedParams = {
    galleryAppTemplateId: 'test-template-id-1',
    syncJobTemplateId: 'test-sync-jpb=template-id-1',
    graphAccessToken: '1111111111-11111',
    graphRefreshAccessToken: '22222222222-222222',
    databricksAccessToken: 'databricksTokens.accessToken',
    databricksRefreshAccessToken: `databricksTokens.refreshToken`,
};
let params = {
    hasFailed: false,
    ...sharedParams,
    databricksUrl,
    filterAadGroupDisplayName,
    galleryAppName,
};

describe('Get Origin URL', () => {
    let expectedResult = 'http://localhost:8000';
    it('should get origin url with no origin provided', () => {
        let origin = ''; 
        let host = 'localhost:8000';
        let result = index.getOriginUrl({origin, host});
        assert.equal(result,expectedResult);
    });

    it('should get origin url with origin provided', () => {
        let origin = 'http://localhost:8000'; 
        let host = '';
        let result = index.getOriginUrl({origin, host});
        assert.equal(result,expectedResult);
    });
});

describe('Get Redirect Login Url', () => {
    it('should get origin url with client id and tenant id', () => {
        let origin = ''; 
        let host = 'localhost:8000';
        let result = index.getRedirectLoginUrl({origin, host, tenantId, clientId});
        expect(result).to.include.string(tenantId);
        expect(result).to.include.string(clientId);

    });
});

describe('postAccessToken', () => {
    const urlRegex = /\/oauth2\/v2.0\/token/;
    afterEach(() => {
        fetchMock.restore();
    });

    it('should call fetch /token with required query parameters', () => {
        fetchMock.mock(urlRegex, 200);
        let calledAction;
        const fakeDispatcher = (action) => {
            calledAction = action;
        };

        const next = index.postAccessToken({
            ...secrets,
            host: 'localhost:8000',
            code: 'graphAuthCode',
            scope: 'tokenSettings.GRAPH_SCOPE' 
        });
        next(fakeDispatcher);

        expect(fetchMock.called(urlRegex)).to.equal(true);
        expect(fetchMock.lastOptions(urlRegex)).to.deep.equal({});

        // let calledUrl = fetchMock.lastUrl(giphyUrlRegex);
        // let queryString = url.parse(calledUrl, true).query;

        // expect(queryString.api_key).to.not.be.null;
        // expect(queryString.limit).to.equal("1");
    });
});