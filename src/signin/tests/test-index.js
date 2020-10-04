const { expect } = require('chai');
// Import the dependencies for testing
const chai = require('chai');
const chaiHttp = require('chai-http');
const cassert = require('chai').assert;
const mocha = require('mocha');

// Configure chai
// const should = chai.should();
chai.use(chaiHttp);

const signin = require('../index.js');

const signinApp = new signin.SigninApp();
signinApp.start();
/*
* Test only the /GET route
*/
const queryParamsEmpty = [
    '/', '/?', '/?code=', '/?code=&otherq=1234',
    '/?other=abcd&code=', '/?other=abcd',
    '/?other=abcd&code=', '/?other=abcd&code=&somethinelse=11', '/?code=""'];

const queryParamsCoded = ['/?code=ABCD', '/?code=00&otherq=1234',
'/?other=abcd&code=ABCD', '/?other=abcd&code=HOLA&somethinelse=11'];
queryParamsEmpty.forEach((qp) => {
    mocha.describe(`Check /GET empty query: "${qp}"`, () => {
        mocha.it('No CB and unable to sign-in', (done) => {
            signinApp.setCallback((code) => {
                cassert(`Should not be called!! Code : ${code}`);
            });
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
                done();
            });
        });
    });
});

// We can  merge two loops together
// But using two separate ones for clarity and explicitness
queryParamsCoded.forEach((qp) => {
    mocha.describe(`Check /GET query with code: "${qp}"`, () => {
        mocha.it('Should get CB and Sign-in', (done) => {
            signinApp.setCallback((code) => {
                expect(code).not.to.be(null).equal(`${qp}`);
            });
            signinApp.app.use((err) => {
                // This should not be called
                cassert.fail(`Should not be called! Something wrong went in express.\n${err.stack}`);
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
                expect(res.text).to.have.string('Successfully signed in!');
                done();
            });
        });
    });
});
