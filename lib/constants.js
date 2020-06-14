module.exports = {

    Signature: {
        LOCAL_FILE_HEADER: 0x04034b50,
        DATA_DESCRIPTOR: 0x08074b50,
        ARCHIVE_EXTRA_DATA: 0x08064b50,
        CENTRAL_DIRECTORY_FILE_HEADER: 0x02014b50,
        DIGITAL_SIGNATURE_HEADER: 0x05054b50,
        ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD: 0x06064b50,
        ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR: 0x07064b50,
        END_OF_CENTRAL_DIRECTORY_RECORD: 0x06054b50
    },

    VersionMadeBy: {
        MSDOS: 0,
        AMIGA: 1,
        OPENVMS: 2,
        UNIX: 3,
        VM_CMS: 4,
        ATARI_ST: 5,
        OS2_HPFS: 6,
        MAC: 7,
        Z_SYSTEM: 8,
        CP_M: 9,
        WIN_NTFS: 10,
        MVS: 11,
        VSE: 12,
        ACORN_RISC: 13,
        VFAT: 14,
        ALT_MVS: 15,
        BEOS: 16,
        TANDEM: 17,
        OS_400: 18,
        OSX: 19
    },

    CompressionMethod: {
        STORE: 0,
        SHRUNK: 1,
        REDUCE_1: 2,
        REDUCE_2: 3,
        REDUCE_3: 4,
        REDUCE_4: 5,
        IMPLODE: 6,
        DEFLATE: 8,
        DEFLATE64: 9,
        TERSE_OLD: 10,
        BZIP2: 12,
        LZMA: 14,
        CMPSC: 16,
        TERSE_NEW: 18,
        LZ77: 19,
        ZSTD: 20,
        JPEG: 96,
        WAVPACK: 97,
        PPMD: 98,
        AE_X: 99
    },

    EncryptionMethod: {
        NONE: 0,
        ZIP20: 1,
        AE_1: 2,
        AE_2: 3
    }

};