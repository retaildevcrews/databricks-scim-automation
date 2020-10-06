const assert = require('chai').assert;
const expect = require('chai').expect;
const index = require('../index.js');
const fetchMock = require('fetch-mock');
const chaiFetchMock = require('chai-fetch-mock');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

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

// describe('API /token', () => {
//     it('it should return 200', (done) => {
//       chai.request('https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token')
//         .post('/')
//         .end((err, res) => {
//           //console.log('req',req);
//           res.should.have.status(200);
//           done();
//         });
//     });
//   });


describe('postAccessToken', () => {
    let urlRegex = /\/token/;
    afterEach(() => {
        fetchMock.restore();
    });

    it('should call fetch /token with required query parameters', () => {
        fetchMock.mock(urlRegex, 200);

        index.postAccessToken({
            ...secrets,
            host: 'localhost:8000',
            code: 'graphAuthCode',
            scope: 'tokenSettings.GRAPH_SCOPE' 
        });
            return expect(fetchMock.called(urlRegex)).to.equal(true);

        //xpect(fetchMock).route('/token').to.have.been.called;
        //console.log('fetct is',fetchMock.config.Request.);
        //expect(fetchMock.headers.Content-Type).to.equal('123456')
        //expect(fetch(urlRegex)).to.have.been.called;
        

         //let calledUrl = fetchMock.lastUrl(urlRegex);
         //let queryString = url.parse(calledUrl, true).query;
         //expect(queryString.client_id).to.not.be.null;
        // expect(queryString.limit).to.equal("1");
    });
});

