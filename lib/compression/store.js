const { PassThrough } = require('stream');

module.exports = {
    compress: () => new PassThrough(),
    uncompress: () => new PassThrough()
};