var httpReq = require('request');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

var RemoteGetDialplanConfig = function(reqId, ani, dnis, context, direction, userUuid, fromUserUuid, opType, extExtraData, appId, url, securityToken, callback)
{
    try
    {
        logger.debug('[DVP-PBXService.RemoteGetPBXDialplanConfig] - [%s] -  Trying to get pbx details from pbx app', reqId);


            var httpUrl = url;

            var jsonObj = { ANI: ani, DNIS: dnis, Context: context, Direction: direction, ExtraData: {UserUuid: userUuid, FromUserUuid: fromUserUuid, OperationType: opType, ExtExtraData: extExtraData, AppId: appId} };

            var jsonStr = JSON.stringify(jsonObj);

            var options = {
                url: httpUrl,
                method: 'POST',
                headers: {
                    'authorization': securityToken,
                    'content-type': 'application/json'
                },
                body: jsonStr
            };

            logger.debug('[DVP-PBXService.RemoteGetPBXDialplanConfig] - [%s] - Creating Api Url : %s', reqId, httpUrl);


            httpReq.post(options, function (error, response, body)
            {
                if (!error && response.statusCode == 200)
                {
                    var apiResp = JSON.parse(body);

                    logger.debug('[DVP-PBXService.RemoteGetPBXDialplanConfig] - [%s] - Extended Dialplan Api returned : %s', reqId, body);

                    callback(undefined, apiResp);
                }
                else
                {
                    logger.error('[DVP-PBXService.RemoteGetPBXDialplanConfig] - [%s] - Extended Dialplan Api call failed', reqId, error);
                    callback(error, undefined);
                }
            })
    }
    catch(ex)
    {
        logger.error('[DVP-PBXService.RemoteGetPBXDialplanConfig] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }
};

module.exports.RemoteGetDialplanConfig = RemoteGetDialplanConfig;