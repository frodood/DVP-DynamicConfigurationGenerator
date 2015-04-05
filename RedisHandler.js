var redis = require("redis");
var Config = require('config');

var redisIp = Config.Redis.IpAddress;
var redisPort = Config.Redis.Port;

var SetObject = function(key, value, callback)
{
    try
    {
        var client = redis.createClient(redisPort, redisIp);

        client.set(key, value, function(err, response)
        {
            callback(err, response);
        });
    }
    catch(ex)
    {
        callback(ex, undefined);
    }

};

module.exports.SetObject = SetObject;