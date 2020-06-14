const { randomBytes } = require('crypto');
const { Transform } = require('stream');
const crcTable = [];

for (let i = 0n; i < 256n; i++) {
    let c = i;

    for (let j = 0; j < 8; j++) {
        c = ((c & 1n) ? (0xedb88320n ^ (c >> 1n)) : (c >> 1n));
    }

    crcTable.push(c);
}

const crc32 = (b, crc) => crcTable[(crc ^ b) & 0xffn] ^ ((crc >> 8n) & 0xffffffn);

class ZipCrypto {

    constructor(password) {
        this.key0 = 0x12345678n;
        this.key1 = 0x23456789n;
        this.key2 = 0x34567890n;

        if (password) {
            if (!Buffer.isBuffer(password)) {
                password = Buffer.from(password);
            }
        
            for (let b of password) {
                this._update(b);
            }
        }
    }

    _update(b) {
        this.key0 = crc32(BigInt(b), this.key0);
        this.key1 = (this.key1 + (this.key0 & 0xffn)) & 0xffffffffn;
        this.key1 = ((this.key1 * 134775813n) + 1n) & 0xffffffffn;
        this.key2 = crc32((this.key1 >> 24n) & 0xffn, this.key2);
    }

    _magicByte() {
        let b = this.key2 | 2n;
        return Number(((b * (b ^ 1n)) >> 8n) & 0xffn);
    }

    _encryptByte(b) {
        let encrypted = b ^ this._magicByte();
        this._update(b);
        return encrypted;
    }

    _decryptByte(b) {
        let decrypted = b ^ this._magicByte();
        this._update(decrypted);
        return decrypted;
    }

    encrypt(data) {
        return data.map(this._encryptByte, this);
    }

    decrypt(data) {
        return data.map(this._decryptByte, this);
    }

}

module.exports = {

    ZipCrypto,

    encrypt: function(options = { password: null, crc32: null }) {
        const crypto = new ZipCrypto(options.password);

        let headerSend = false;

        return new Transform({
            transform: function (chunk, encoding, cb) {
                if (!headerSend) {
                    let header = randomBytes(12);
                    header.writeUInt16LE(this.crc32, 10);

                    let encryptedHeader = crypto.encrypt(header);

                    this.push(encryptedHeader);

                    headersSend = true;
                }

                let encrypted = crypto.encrypt(chunk);

                if (encrypted.length) {
                    this.push(encrypted);
                }

                cb();
            }
        });
    },

    decrypt: function(options = { password: null, crc32: null }) {
        const crypto = new ZipCrypto(options.password);

        let header = Buffer.alloc(0);
        let headerProcessed = false;

        return new Transform({
            transform: function(chunk, encoding, cb) {
                if (!headerProcessed) {
                    header = Buffer.concat([header, chunk]);

                    if (header.length > 12) {
                        chunk = chunk.slice(12 - header.length);
                        header = header.slice(0, 12);

                        let decryptedHeader = crypto.decrypt(header);
                        let checkPassword = (options.flags & 8)
                            ? (options.time >>> 8) & 0xff
                            : (options.crc32 >>> 24) & 0xff;
                        
                        if (decryptedHeader[11] != checkPassword) {
                            return cb('ZIP: Invalid password');
                        }

                        headerProcessed = true;
                    } else {
                        chunk = Buffer.alloc(0);
                    }
                }

                let decrypted = crypto.decrypt(chunk);

                if (decrypted.length) {
                    this.push(decrypted);
                }

                cb();
            }
        });
    }

};