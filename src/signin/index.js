const express = require('express');
const url = require('url');
const { getRedirectLoginUrl } = require('@databricks-scim-automation/graph');

const port = process.env.PORT || 8000;
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

module.exports = {
    host,
    redirectLoginUrl,
    SigninApp
};