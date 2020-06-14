const { CompressionMethod } = require('../constants');

module.exports = {
    [CompressionMethod.STORE]: require('./store'),
    [CompressionMethod.DEFLATE]: require('./deflate')
};
