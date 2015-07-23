var underscore = require('underscore');
var xmlBuilder = require('./XmlExtendedDialplanBuilder.js');
var xBuilder = require('./XmlResponseGenerator.js');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;

var CreateConferenceEndpointList = function(reqId, context, companyId, tenantId, dialOutUsers, confExt, callback)
{
    var epList = [];
    try
    {
        var len = dialOutUsers.length;
        var count = 0;

        if(dialOutUsers)
        {
            dialOutUsers.forEach(function(dOutUsr)
            {
                if(count < len)
                {
                    if (dOutUsr.ObjCategory === 'External')
                    {
                        //pick outbound rule with destination as dnis
                        ruleBackendHandler.PickCallRuleOutboundComplete('', dOutUsr.Destination, '', context, companyId, tenantId, false, function (err, rule) {
                            if (!err && rule)
                            {
                                var ep =
                                {
                                    Profile: rule.GatewayCode,
                                    Type: 'GATEWAY',
                                    LegStartDelay: 0,
                                    BypassMedia: false,
                                    LegTimeout: rule.Timeout,
                                    Destination: rule.DNIS,
                                    Domain: rule.Domain,
                                    Origination: rule.ANI,
                                    OriginationCallerIdNumber: rule.ANI
                                };


                                epList.push(ep);

                                count++;

                                if (count >= len)
                                {
                                    callback(undefined, epList);
                                }
                            }
                        })

                        //create ep add to ep arr
                    }
                    else
                    {
                        //pick user
                        if (dOutUsr.SipUACEndpoint && dOutUsr.SipUACEndpoint.CloudEndUser)
                        {
                            var ep =
                            {
                                Profile: '',
                                Type: 'USER',
                                LegStartDelay: 0,
                                BypassMedia: false,
                                LegTimeout: 60,
                                Origination: confExt,
                                OriginationCallerIdNumber: confExt,
                                Destination: dOutUsr.SipUACEndpoint.SipExtension,
                                Domain: dOutUsr.SipUACEndpoint.CloudEndUser.Domain
                            };

                            epList.push(ep);

                            count++;

                            if (count >= len)
                            {
                                callback(undefined, epList);
                            }
                        }

                        //create ep add to ep arr
                    }
                }
                else
                {
                    callback(undefined, epList);
                }
            })
        }
        else
        {
            callback(undefined, epList);
        }

    }
    catch(ex)
    {
        callback(ex, epList);
    }
};


var ConferenceHandlerOperation = function(reqId, ext, direction, fromUserUuid, context, profile, companyId, tenantId, callback)
{
    try
    {
        if(ext.Conference)
        {
            logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Checking Conference Time', reqId);
            var curTime = new Date();

            if(ext.Conference.StartTime <= curTime && ext.Conference.EndTime >= curTime)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Checking Conference Time OK', reqId);
                var maxUsers = 0;
                var currUsers = 0;
                var allowAnonymous = false;
                var conferenceName = '';
                var conferenceDomain = '';
                var pin = '';
                var mode = '';

                if(ext.Conference.MaxUser)
                {
                    maxUsers = ext.Conference.MaxUser;
                }

                if(ext.Conference.CurrentUsers)
                {
                    currUsers = ext.Conference.CurrentUsers;
                }

                var allowedCount = maxUsers - currUsers;

                if(allowedCount > 0)
                {
                    if(ext.Conference.AllowAnonymousUser)
                    {
                        allowAnonymous = true;
                    }
                    if(ext.Conference.ConferenceName)
                    {
                        conferenceName = ext.Conference.ConferenceName;
                    }

                    if(ext.Conference.CloudEndUser && ext.Conference.CloudEndUser.Domain)
                    {
                        conferenceDomain = ext.Conference.CloudEndUser.Domain;
                    }

                    if(ext.Conference.Pin)
                    {
                        pin = ext.Conference.Pin;
                    }

                    var isFirst = true;

                    if(ext.Conference.Def)
                    {
                        mode = 'deaf';
                        isFirst = false;
                    }

                    if(direction === 'IN')
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Conference Direction IN', reqId);
                        if(allowAnonymous)
                        {
                            logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - ANONYMOUS ALLOWED', reqId);
                            var emptyArr = [];
                             //normal conference dialplan
                            var xml = xmlBuilder.CreateConferenceDialplan(reqId, emptyArr, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, '');

                            callback(undefined, xml);

                        }
                        else
                        {
                            //dont allow
                            logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - ANONYMOUS NOT ALLOWED ERROR', reqId);
                            callback(new Error('Anonymous users not allowed'), xBuilder.createNotFoundResponse());
                        }
                    }
                    else
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Conference Direction OUT', reqId);
                        if(ext.Conference.ConferenceUser && ext.ConferenceUser.length > 0)
                        {
                            var usr = underscore.find(ext.Conference.ConferenceUser, function(confUser){return confUser.SipUACEndpoint.UserUuid === fromUserUuid});

                            if(usr)
                            {
                                //allowed user

                                var dialOutUsers = underscore.filter(ext.Conference.ConferenceUser, function(usr){return usr.JoinType === 'Out' && usr.UserStatus != 'JOINED'});

                                var epList = CreateConferenceEndpointList(reqId, context, companyId, tenantId, dialOutUsers, ext.Extension);

                                var mode = '';
                                var isFirst = true;

                                if (usr.Def)
                                {
                                    mode = mode + 'deaf';
                                    isFirst = false;
                                }
                                if (usr.Mod)
                                {
                                    if(isFirst)
                                    {
                                        mode = mode + 'moderator';
                                    }
                                    else
                                    {
                                        mode = mode + '|moderator';
                                    }
                                }
                                if (usr.Mute)
                                {
                                    if(isFirst)
                                    {
                                        mode = mode + 'mute';
                                    }
                                    else
                                    {
                                        mode = mode + '|mute';
                                    }
                                }

                                var xml = xmlBuilder.CreateConferenceDialplan(reqId, epList, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, mode);

                                callback(undefined, xml);



                            }
                            else
                            {
                                if(allowAnonymous)
                                {
                                    var emptyArr = [];
                                    //normal conference dialplan
                                    var xml = xmlBuilder.CreateConferenceDialplan(reqId, emptyArr, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, '');

                                    callback(undefined, xml);
                                }
                                else
                                {
                                    callback(new Error('Anonymous users not allowed'), xBuilder.createNotFoundResponse());
                                }
                            }
                        }
                        else
                        {
                            if(allowAnonymous)
                            {
                                var emptyArr = [];
                                //normal conference dialplan
                                var xml = xmlBuilder.CreateConferenceDialplan(reqId, emptyArr, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, '');

                                callback(undefined, xml);
                            }
                            else
                            {
                                logger.error('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Error Occurred', reqId, new Error('Anonymous users not allowed'));
                                callback(new Error('Anonymous users not allowed'), xBuilder.createNotFoundResponse());
                            }
                        }

                    }
                }
                else
                {
                    //dont allow
                    logger.error('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Error Occurred', reqId, new Error('Max allowed users reached'));
                    callback(new Error('Max allowed users reached'), xBuilder.createNotFoundResponse());
                }

            }
            else
            {
                logger.error('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Error Occurred', reqId, new Error('Conference not started yet'));
                callback(new Error('Conference not started yet'), xBuilder.createNotFoundResponse());
            }
        }
        else
        {
            logger.error('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Error Occurred', reqId, new Error('Conference not found'));
            callback(new Error('Conference not found'), xBuilder.createNotFoundResponse());
        }

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.ConferenceHandlerOperation] - [%s] - Error Occurred', reqId, ex);
        callback(ex, xBuilder.createNotFoundResponse());
    }
};

module.exports.ConferenceHandlerOperation = ConferenceHandlerOperation;