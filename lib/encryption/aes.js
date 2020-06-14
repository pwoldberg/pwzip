const { randomBytes, pbkdf2Sync, createHmac, createCipheriv } = require('crypto');
const { Transform } = require('stream');
const BlockSize = { 1: 16, 2: 24, 3: 32 };

class AesCrypto {

    constructor(blockSize) {
        this.blockSize = blockSize;
        this.counter = Buffer.from('01000000000000000000000000000000', 'hex')
    }

    increment() {
        for (let i = 0; i < 16; i++) {
            if (this.counter[i] == 255) {
                this.counter[i] = 0;
            } else {
                this.counter[i]++;
                break;
            }
        }
    }

    deriveKey(salt, password) {
        const key = pbkdf2Sync(password, salt, 1000, 2 * this.blockSize + 2, 'sha1');

        this.aesKey = key.slice(0, this.blockSize);
        this.hmacKey = key.slice(this.blockSize, 2 * this.blockSize);
        this.passwordVerification = key.slice(-2);
    }

    encrypt(data) {
        let algorithm = `aes-${8 * this.blockSize}-ctr`;
        let encrypted = Buffer.alloc(0);
        
        for (let i = 0; i < data.length; i+=16) {
            let cipher = createCipheriv(algorithm, this.aesKey, this.counter);
            encrypted = Buffer.concat([encrypted, cipher.update(data.slice(i, i + 16))]);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            this.increment();
        }

        return encrypted;
    }

    decrypt(data) {
        return this.encrypt(data);
    }

}

module.exports = {

    encrypt: function(options = { encryptionMethod: null, encryptionStrength: null, password: null }) {
        const blockSize = BlockSize[options.encryptionStrength];
        const saltSize = blockSize / 2;
        const crypto = new AesCrypto(blockSize);
        const salt = randomBytes(saltSize);

        crypto.deriveKey(salt, Buffer.from(options.password));

        let buffer = Buffer.alloc(0);
        let headerProcessed = false;

        return new Transform({
            transform: function(chunk, encoding, cb) {
                if (!headerProcessed) {
                    this.push(salt);
                    this.push(crypto.passwordVerification);
                    headerProcessed = true;
                }

                buffer = Buffer.concat([buffer, chunk]);

                let rest = buffer.length % 16;

                if (buffer.length >= 16) {
                    let data = buffer.slice(0, buffer.length - rest);
                    this.push(crypto.encrypt(data));
                    this.hmac.update(data);
                    buffer = buffer.slice(-rest);
                } else {
                    // TODO: detect end of file
                    this.push(crypto.decrypt(buffer));
                    this.hmac.update(buffer);
                    this.push(this.hmac.digest().slice(0, 10));
                }

                cb();
            }
        });
    },

    decrypt: function(options = { encryptionMethod: null, encryptionStrength: null, password: null }) {
        const blockSize = BlockSize[options.encryptionStrength];
        const saltSize = blockSize / 2;
        const crypto = new AesCrypto(blockSize);

        let buffer = Buffer.alloc(0);
        let headerProcessed = false;
        let offset = 0

        return new Transform({
            transform: function(chunk, encoding, cb) {
                buffer = Buffer.concat([buffer, chunk]);

                if (!headerProcessed) {
                    if (buffer.length > saltSize + 2) {
                        let salt = buffer.slice(0, saltSize);
                        let verificationValue = buffer.slice(saltSize, saltSize + 2);
                        
                        crypto.deriveKey(salt, Buffer.from(options.password));
                        
                        this.hmac = createHmac('sha1', crypto.hmacKey);
                        
                        if (!crypto.passwordVerification.equals(verificationValue)) {
                            return cb('ZIP: Invalid password');
                        }
                        
                        buffer = buffer.slice(saltSize + 2);
                        headerProcessed = true;
                    } else {
                        return cb();
                    }
                }
                
                offset += chunk.length;

                if (offset == options.compressedSize) {
                    this.authenticationCode = buffer.slice(-10);
                    buffer = buffer.slice(0, buffer.length - 10);
                }

                let rest = buffer.length % 16;

                if (buffer.length >= 16) {
                    let data = buffer.slice(0, buffer.length - rest);
                    this.hmac.update(data);
                    this.push(crypto.decrypt(data));
                    buffer = buffer.slice(-rest);
                }

                if (this.authenticationCode) {
                    this.hmac.update(buffer);
                    this.push(crypto.decrypt(buffer));
                    let hmac = this.hmac.digest().slice(0, 10);
                    if (!this.authenticationCode.equals(hmac)) {
                        throw new Error('ZIP: AES authentication error.');
                    }
                }

                cb();
            }
        });
    }

};