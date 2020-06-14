module.exports = {

    decodeDateTime: function(date, time) {
        return new Date(
            (date >>> 9) + 1980,
            ((date >>> 5) & 15) - 1,
            (date) & 31,
            (time >>> 11) & 31,
            (time >>> 5) & 63,
            (time & 63) << 1
        );
    },

    encodeDateTime: function(datetime) {
        let date = 0, time = 0;

        date |= datetime.getDate() & 31;
        date |= ((datetime.getMonth() + 1) & 15) << 5;
        date |= ((datetime.getFullYear() - 1980) & 127) << 9;

        time |= Math.floor(datetime.getSeconds() / 2);
        time |= (datetime.getMinutes() & 63) << 5;
        time |= (datetime.getHours() & 31) << 11;
        
        return { date, time };
    },

    getType: function(obj) {
        if (obj === undefined) return 'Undefined';
        return Object.prototype.toString.call(obj).replace(/\[object (\w+)\]/, '$1');
    }

};