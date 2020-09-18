const express = require('express');
const url = require('url');
const { getRedirectLoginUrl } = require('@databricks-scim-automation/graph');

const port = process.env.PORT || 8000;
const host = `localhost:${port}`;
const redirectLoginUrl = getRedirectLoginUrl({ host });
const app = express();

const startApp = (cb) => {
    app.get('/', async (req, res) => {
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
        return cb(code)
    });

    app.listen(port);
};

module.exports = {
    startApp,
    host,
    redirectLoginUrl,
};