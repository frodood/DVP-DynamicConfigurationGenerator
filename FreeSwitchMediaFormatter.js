var convertUrlEncoded = function(payload)
{
    var obj = {};

    try
    {
        var keyValArr = payload.split('&');

        for (var i = 0; i < keyValArr.length; i++) {
            var bits = keyValArr[i].split('=');
            obj[bits[0]] = bits[1];
        }
    }
    catch(ex)
    {

    }

    return obj;

};

module.exports.convertUrlEncoded = convertUrlEncoded;