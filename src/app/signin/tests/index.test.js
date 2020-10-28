const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');
const spies = require('chai-spies');
const mocha = require('mocha');

chai.use(chaiHttp);
chai.use(spies);

const signin = require('../index.js');

const signinApp = new signin.SigninApp();
signinApp.start();

// URI Test cases for various types of Empty code query
const queryParamsEmpty = ['/?code=', '/?code=&otherq=1234',
'/?other=abcd&code=', '/?other=abcd',
'/?other=abcd&code=', '/?other=abcd&code=&somethinelse=11'];

// URI Test cases for various position of code query
const queryParamsCoded = ['/?code=00&otherq=1234',
'/?other=abcd&code=ABCD', '/?code=ABCD', '/?other=abcd&code=HOLA&somethinelse=11'];
mocha.describe('Check Various /GET empty queries', () => {
    queryParamsEmpty.forEach((qp) => {
        mocha.it(`Checking path: : "${qp}"`, (done) => {
            // Set our spy callback
            const spiedCb = chai.spy();
            signinApp.setCallback(spiedCb);
            signinApp.app.use((err, req, res, next) => {
                const excp = err.message;
                // This is just a soft check
                expect(excp).to.have.string('Unable to get sign-in code!');
                // Making sure we have the right return values
                // by calling next('route') we're basically
                // telling express to ignore this returned exception
                next('route');
            });
            chai
            .request(signinApp.app)
            .get(`${qp}`)
            .end((err, res) => {
                // This is weird, coz even if the login was unsuccessful
                // Signin returned HTT 200
                expect(res).to.have.status(200);
                expect(res.text).be.a('string');
                expect(res.body).be.a(typeof ({}));
                // Making sure we have the right return values
                expect(res.text).to.have.string('Unable to get sign-in code!');
                // We should not have a callback
                expect(spiedCb).to.not.have.been.called();
                done();
            });
        });
    });
});

// We can  merge two loops together
// But using two separate ones for clarity and explicitness
mocha.describe('Checking uri with valid /GET query', () => {
    queryParamsCoded.forEach((qp) => {
        mocha.it(`Checking path : "${qp}"`, (done) => {
            // Setup our spy callback
            const spiedCb = chai.spy(/* Dummy callback */);
            signinApp.setCallback(spiedCb);

            chai
            .request(signinApp.app)
            .get(`${qp}`)
            .end((err, res) => {
                // This is weird, coz even if the login was unsuccessful
                // Signin returned HTT 200
                expect(res).to.have.status(200);
                expect(res.text).be.a('string');
                expect(res.body).be.a(typeof ({}));
                // Making sure we have the right return values
                expect(res.text).to.have.string('Successfully signed in!');
                // Naive way to check query val
                const matches = qp.match('code=([^&]*)'); // There should be 2 Matches: code=CODE and CODE
                // We expect callback from app.get
                expect(spiedCb).to.have.been.called.with(matches[1]);

                done();
            });
        });
    });
});
