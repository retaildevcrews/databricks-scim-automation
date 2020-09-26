const express = require('express');
const url = require('url');
const { getRedirectLoginUrl } = require('@databricks-scim-automation/graph');

const port = process.env.PORT || 8000;
const databricksPort = 1337;
const host = `localhost:${port}`;
const redirectLoginUrl = params => getRedirectLoginUrl({ host, ...params });
const app = express();

class SigninApp {
    constructor() {
        this.app = express();
    }

    start() {
        app.get('/', (req, res) => {
            // Gets sign-in code from URL
            const { query: { code } } = url.parse(req.url, true);
            if (!code) {
                const errorMessage = 'Unable to get sign-in code!';
                res.send(errorMessage);
                throw new Error(errorMessage);
            }
            // Notifies user
            res.send('Successfully signed in!');
            // Calls cb with code
            return this.cb(code)
        });
    
        app.listen(port);
    }

    setCallback(callback) {
        this.cb = callback;
    }
}

// const startGraphApp = (cb) => {
//     app.get('/', async (req, res) => {
//         // Gets sign-in code from URL
//         const { query: { code } } = url.parse(req.url, true);
//         if (!code) {
//             const errorMessage = 'Unable to get sign-in code!';
//             res.send(errorMessage);
//             throw new Error(errorMessage);
//         }
//         // Notifies user
//         res.send('Successfully signed in!');
//         // Calls cb with code
        
//         return cb(code)
//     });

//     app.listen(port);
// };

// const startDatabricksApp = (cb) => {
//     app1.get('/', async (req, res) => {
//         // Gets sign-in code from URL
//         const { query: { code } } = url.parse(req.url, true);
//         console.log('code received', code);
//         if (!code) {
//             const errorMessage = 'Unable to get sign-in code!';
//             res.send(errorMessage);
//             throw new Error(errorMessage);
//         }
//         // Notifies user
//         res.send('Successfully signed in!');
//         // Calls cb with code
        
//         return cb(code)
//     });

//     app1.listen(databricksPort);
// };

module.exports = {
    //startGraphApp,
    host,
    redirectLoginUrl,
    //startDatabricksApp,
    SigninApp
};