var convertUrlEncoded = function(payload) {

    var keyValArr = payload.split('&');
    var obj = {};
    for (var i = 0; i < keyValArr.length; i++) {
        var bits = keyValArr[i].split('=');
        obj[bits[0]] = bits[1];
    }

    return obj;

};

module.exports.convertUrlEncoded = convertUrlEncoded;