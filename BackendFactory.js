/**
 * Created by dinusha on 8/8/2016.
 */


var backendHandler;
var ruleHandler;
var config = require('config');

var useCache = config.UseCache;

if(useCache)
{
    backendHandler = require('./CacheBackendHandler.js');
    ruleHandler = require('dvp-ruleservice/CacheBackendOperations.js');
}
else
{
    backendHandler = require('./SipExtBackendOperations.js');
    ruleHandler = require('dvp-ruleservice/CallRuleBackendOperations.js');
}

var changeBackendHandler = function(mode)
{
    if(mode === 'DB')
    {

        backendHandler = require('./SipExtBackendOperations.js');
        ruleHandler = require('dvp-ruleservice/CallRuleBackendOperations.js');
    }
    else if(mode === 'CACHE')
    {
        backendHandler = require('./CacheBackendHandler.js');
        ruleHandler = require('dvp-ruleservice/CacheBackendOperations.js');
    }

};

var getBackendHandler = function()
{
    return backendHandler;
};

var getRuleHandler = function()
{
    return ruleHandler;
};

module.exports.changeBackendHandler = changeBackendHandler;
module.exports.getBackendHandler = getBackendHandler;
module.exports.getRuleHandler = getRuleHandler;
