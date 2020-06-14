const crcTable = [];

for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable.push(c);
}

module.exports = function(buf, prev) {
    let crc = prev ^ -1;

    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ -1) >>> 0;
};
