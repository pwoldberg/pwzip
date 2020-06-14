const { PassThrough } = require('stream');

module.exports = {
    encrypt: () => new PassThrough(),
    decrypt: () => new PassThrough()
};