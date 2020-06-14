const fs = require('fs-extra');
const path = require('path');
const ZipEntry = require('./zipentry');
const { Signature } = require('./constants');

class Zip {

    constructor() {
        this.fd = null;
        this.offset = 0;
        this.size = 0;
        this.entries = [];
    }    

    async open(file, options) {
        if (this.fd) {
            await this.close();
        }

        this.options = options;
        this.fd = await fs.open(file, 'r');
        this.stats = await fs.fstat(this.fd);
        this.size = this.stats.size;

        // maxCommentLength + eocdSize + zip64LocatorSize
        const size = Math.min(this.size, 0xffff + 22 + 20);
        const buffer = await this.toBuffer(this.size - size, size);

        for (let offset = size - 22; offset >= 20; offset--) {
            if (buffer.readUInt32LE(offset) == Signature.END_OF_CENTRAL_DIRECTORY_RECORD) {
                const commentLength = buffer.readUInt16LE(offset + 20);
                
                if (offset + 22 + commentLength == this.size) {
                    const eocd = {
                        diskNumber: buffer.readUInt16LE(offset + 4),
                        diskStart: buffer.readUInt16LE(offset + 6),
                        diskRecords: buffer.readUInt16LE(offset + 8),
                        totalRecords: buffer.readUInt16LE(offset + 10),
                        centralDirLength: buffer.readUInt32LE(offset + 12),
                        centralDirOffset: buffer.readUInt32LE(offset + 16),
                        comment: buffer.slice(offset + 22).toString()
                    };

                    if (eocd.diskNumber       >= 0xffff ||
                        eocd.diskStart        >= 0xffff ||
                        eocd.diskRecords      >= 0xffff ||
                        eocd.totalRecords     >= 0xffff ||
                        eocd.centralDirLength >= 0xffffffff ||
                        eocd.centralDirOffset >= 0xffffffff) {
                        if (buffer.readUInt32LE(offset - 20) != Signature.ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR) {
                            throw new Error('ZIP: Zip64 end of central directory locator signature is invalid');
                        }

                        if (buffer.readUInt32LE(offset - 4) > 1) {
                            throw new Error('ZIP: Multi-volumes zip are not supported');
                        }

                        const zip64Offset = Number(buffer.readBigUInt64LE(offset - 12));                        
                        const buffer2 = await this.toBuffer(zip64Offset, 56)
                
                        if (buffer2.readUInt32LE(0) !== Signature.ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD) {
                            throw new Error('ZIP: Zip64 end of central directory record signature is invalid');
                        }

                        eocd.diskNumber = buffer2.readUInt32LE(16);
                        eocd.diskStart = buffer2.readUInt32LE(20);
                        eocd.diskRecords = Number(buffer2.readBigUInt64LE(24));
                        eocd.totalRecords = Number(buffer2.readBigUInt64LE(32));
                        eocd.centralDirLength = Number(buffer2.readBigUInt64LE(40));
                        eocd.centralDirOffset = Number(buffer2.readBigUInt64LE(48));
                    }

                    const buffer3 = await this.toBuffer(eocd.centralDirOffset, eocd.centralDirLength);

                    for (let offset = 0; offset < buffer3.length;) {
                        if (buffer3.readUInt32LE(offset) != Signature.CENTRAL_DIRECTORY_FILE_HEADER) {
                            throw new Error('ZIP: Central directory file header signature is invalid');
                        }

                        const filenameLength = buffer3.readUInt16LE(offset + 28);
                        const extraFieldLength = buffer3.readUInt16LE(offset + 30);
                        const commentLength = buffer3.readUInt16LE(offset + 32);
                        const filenameOffset = offset + 46;
                        const extraFieldOffset = filenameOffset + filenameLength;
                        const commentOffset = extraFieldOffset + extraFieldLength;
                        const endOffset = commentOffset + commentLength;

                        const entry = new ZipEntry(this, {
                            flags: buffer3.readUInt16LE(offset + 8),
                            compressionMethod: buffer3.readUInt16LE(offset + 10),
                            time: buffer3.readUInt16LE(offset + 12),
                            date: buffer3.readUInt16LE(offset + 14),
                            crc32: buffer3.readUInt32LE(offset + 16),
                            compressedSize: buffer3.readUInt32LE(offset + 20),
                            uncompressedSize: buffer3.readUInt32LE(offset + 24),
                            internalFileAttr: buffer3.readUInt16LE(offset + 36),
                            externalFileAttr: buffer3.readUInt32LE(offset + 38),
                            offset: buffer3.readUInt32LE(offset + 42),
                            filename: buffer3.toString('utf8', filenameOffset, extraFieldOffset),
                            comment: buffer3.toString('utf8', commentOffset, endOffset)
                        });

                        entry.filename = entry.filename.replace(/\\/g, '/');
                        if (entry.filename.includes('../')) {
                            throw new Error(`ZIP: Filename "${entry.filename}" has an invalid path`);
                        }

                        await entry.init();

                        this.entries.push(entry);

                        offset += 46 + filenameLength + extraFieldLength + commentLength;
                    }

                    return;
                }
            }
        }

        throw new Error('ZIP: End of central directory record not found');
    }

    async close() {
        if (this.fd) {
            await fs.close(this.fd);
        }

        this.fd = null;
        this.offset = 0;
        this.size = 0;
        this.entries = [];
    }

    async test(options = { password: null }) {
        for (let entry of this.entries) {
            if (!await entry.test(options)) {
                return false;
            }
        }

        return true;
    }

    async extract(dir, options = { password: null }) {
        for (let entry of this.entries) {
            const dest = path.join(dir, entry.filename);
            await entry.extract(dest, options);
        }
    }

    async toBuffer(offset, length) {
        const buffer = Buffer.alloc(length);
        const bytesRead = await fs.read(this.fd, buffer, 0, length, offset);
        if (bytesRead < length) throw new Error('ZIP: Unexpected EOF');
        return buffer;
    }

    stream(offset, length) {
        return fs.createReadStream('zip', {
            autoClose: false,
            fd: this.fd,
            start: offset,
            end: offset + length - 1
        });
    }

}

module.exports = Zip;