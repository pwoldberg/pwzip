const { createDeflateRaw, createInflateRaw } = require('zlib');

module.exports = {
    compress: createDeflateRaw,
    uncompress: createInflateRaw
};