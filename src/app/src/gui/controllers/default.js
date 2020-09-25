/**
 * Sends response for an unaccounted method and route combination
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @return {void}
 */
function sendDefault (req, res) {
    res.set('Content-Type', 'text/plain').status(405).send('Unsupported Method');
};

module.exports = { sendDefault };