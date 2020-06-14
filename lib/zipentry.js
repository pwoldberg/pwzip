const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const stream = require('stream');
const crc32 = require('./crc32');
const { Signature, CompressionMethod, EncryptionMethod } = require('./constants');
const compression = require('./compression');
const encryption = require('./encryption');
const pipeline = util.promisify(stream.pipeline);

class ZipEntry {

    constructor(zip, header) {
        this.zip = zip;
        this.fd = this.zip.fd;
        Object.assign(this, header);
    }

    async init() {
        const buffer = await this.zip.toBuffer(this.offset, 30);

        if (buffer.readUInt32LE(0) !== Signature.LOCAL_FILE_HEADER) {
            throw new Error('ZIP: Local file header signature is invalid');
        }

        const filenameLength = buffer.readUInt16LE(26);
        const extraFieldLength = buffer.readUInt16LE(28);

        this.offset += 30 + filenameLength;
        this.extraField = await this.zip.toBuffer(this.offset, extraFieldLength);
        this.offset += extraFieldLength;
        
        this.encryptionMethod = EncryptionMethod.NONE;

        if (this.flags & 1) {
            this.encryptionMethod = EncryptionMethod.ZIP20;
        }

        if (this.compressionMethod = CompressionMethod.AE_X) {
            // https://www.winzip.com/win/en/aes_info.html
            if (this.flags & 1) {
                if (this.extraField.readUInt16LE(0) == 0x9901) {
                    let length = this.extraField.readUInt16LE(2);
                    let version = this.extraField.readUInt16LE(4);
                    let vendor = this.extraField.toString('utf8', 6, 8);
                    this.encryptionMethod = EncryptionMethod[vendor + '_' + version];
                    this.encryptionStrength = this.extraField.readUInt8(8);
                    this.compressionMethod = this.extraField.readUInt16LE(9);
                } else {
                    throw new Error('ZIP: AES encryption detected but extrafield not found');
                }
            } else {
                this.compressionMethod = CompressionMethod.STORE;
                this.encryptionMethod = EncryptionMethod.NONE;
            }
        }
    }

    isDirectory() {
        return this.filename.endsWith('/');
    }

    isFile() {
        return !this.filename.endsWith('/');
    }

    async toBuffer() {
        const chunks = [];

        await pipeline(this.stream(), new stream.Writable({
            write(chunk, encoding, cb) {
                chunks.push(chunk);
                cb();
            }
        }));

        return Buffer.concat(chunks);
    }

    async extract(dest, options) {
        options = Object.assign({}, this, options);

        if (this.isDirectory()) {
            return fs.ensureDir(dest);
        } else if (!this.compressedSize) {
            return fs.ensureFile(dest);
        } else {
            await fs.ensureDir(path.dirname(dest));
            return pipeline(this.stream(options), fs.createWriteStream(dest));
        }
    }

    async test(options) {
        if (this.compressedSize === 0) return true;

        options = Object.assign({}, this, options);

        let crc = 0;

        await pipeline(this.stream(options), new stream.Writable({
            write(chunk, encoding, cb) {
                crc = crc32(chunk, crc);
                cb();
            }
        }));

        return crc == this.crc32;
    }

    stream(options) {
        if (!encryption[this.encryptionMethod]) {
            throw new Error('ZIP: Unsupported encryption method ' + this.encryptionMethod);
        }

        if (!compression[this.compressionMethod]) {
            throw new Error('ZIP: Unsupported compression method ' + this.compressionMethod);
        }

        return this.zip
            .stream(this.offset, this.compressedSize)
            .pipe(encryption[this.encryptionMethod].decrypt(options))
            .pipe(compression[this.compressionMethod].uncompress(options));
    }

}

module.exports = ZipEntry;