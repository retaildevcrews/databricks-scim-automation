const boolNoop = bool => () => bool;

const delay = (time) => new Promise(done => setTimeout(() => done(), time));

const keepFetching = (fn, failed, hasStatusErred=boolNoop(false), hasBodyErred=boolNoop(false)) => async function(retries, body) {
    if (retries === 0) {
        return failed(body);
    }
    await delay(5000);
    return await fn().then(async response => {
        const body = await response.json();
        if (hasStatusErred(response.status)) {
            return await keepFetching(fn, failed, hasStatusErred, hasBodyErred)(retries - 1, body);
        }
        if (hasBodyErred(body)) {
            return await keepFetching(fn, failed, hasStatusErred, hasBodyErred)(retries - 1, body);
        }
        return body;
    });
};

module.exports = {
    boolNoop,
    delay,
    keepFetching,
}