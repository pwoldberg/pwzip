const { EncryptionMethod } = require('../constants');

module.exports = {
    [EncryptionMethod.NONE]: require('./none'),
    [EncryptionMethod.ZIP20]: require('./zip20'),
    [EncryptionMethod.AE_1]: require('./aes'),
    [EncryptionMethod.AE_2]: require('./aes')
};
