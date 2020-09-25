const url = require('url');
const graph = require('@databricks-scim-automation/graph');

/**
 * Adds an instance of an application, scim connector, from the Azure AD application gallery into directory
 * @param {Object} req Express request (galleryAppTemplateId, 8adf8e6e-67b2-4cf2-a259-e3dc5476c621, can be used to instantiate non-gallery app)
 * @param {Object} res Express response
 * @param {void}
 */
async function postScimConnectorGalleryApp(req, res) {
    try {
        const accessToken = req.headers['x-access-token'];
        const { query: { galleryAppTemplateId, galleryAppName } } = url.parse(req.url, true);
        const response = await graph.postScimConnectorGalleryApp({ accessToken, galleryAppTemplateId, galleryAppName });
        const contentType = response.headers._headers['content-type'][0];
        const body = contentType.includes('json') ? await response.json() : await response.text();
        // Use service principal object ID for other calls: body.servicePrincipal.objectId
        res.set('Content-Type', contentType).status(response.status).send(body);
    } catch(err) {
        const errorMessage = 'Error creating scim gallery app';
        console.error(errorMessage + ': ', err);
        res.set('Content-Type', 'text/plain').status(500).send(errorMessage);
    }
}

module.exports = { postScimConnectorGalleryApp };