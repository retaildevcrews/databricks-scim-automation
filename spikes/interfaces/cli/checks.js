function signinCode(code) {
    if (!code) {
        throw new Error('Unable to get sign-in code!');
    }
}

function postAccessToken(status) {
    if (status !== 200) {
        throw new Error('Unable to get tokens!');
    }
}

module.exports = {
    signinCode,
    postAccessToken,
};