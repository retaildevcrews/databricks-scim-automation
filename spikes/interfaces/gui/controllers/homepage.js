const path = require('path');
const fs = require('fs');

/**
 * Sends html/JS for Database SCIM Automation GUI
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
function getHomepage(req, res) {
    const htmlPath = path.resolve(__dirname, '../views/homepage.html');
    try {
        const response = fs.readFileSync(htmlPath);
        res.set('Content-Type', 'text/html').send(response);
    } catch (err) {
        const errorMessage = 'Error reading and sending homepage html';
        console.error(errorMessage + ': ', err);
        res.status(500).set('Content-Type', 'text/plain').send(errorMessage);
    }
}

module.exports = { getHomepage };