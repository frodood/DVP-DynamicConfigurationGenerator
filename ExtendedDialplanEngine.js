var nodeUuid = require('node-uuid');
var messageFormatter = require('DVP-Common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;
var config = require('config');
var extApi = require('./ExternalApiAccess.js');
var backendHandler = require('./SipExtBackendOperations.js');
var xmlBuilder = require('./XmlExtendedDialplanBuilder.js');
var transHandler = require('DVP-RuleService/TranslationHandler.js');
var redisHandler = require('./RedisHandler.js');
var ruleHandler = require('DVP-RuleService/CallRuleBackendOperations.js');
var conferenceHandler = require('./ConferenceOperations.js');

var CreateFMEndpointList = function(reqId, aniNum, context, companyId, tenantId, fmList, dodNum, dodActive, callerIdNum, callerIdName, callback)
{
    var epList = [];
    try
    {
        var len = fmList.length;
        var count = 0;

        fmList.forEach(function(fm)
        {
            if(count < len)
            {
                if (fm.ObjCategory === 'GATEWAY')
                {
                    //pick outbound rule
                    ruleHandler.PickCallRuleOutboundComplete(aniNum, fm.DestinationNumber, '', context, companyId, tenantId, false, function (err, rule)
                    {
                        if (!err && rule)
                        {
                            var ep =
                            {
                                Profile: rule.GatewayCode,
                                Type: 'GATEWAY',
                                LegStartDelay: 0,
                                BypassMedia: false,
                                LegTimeout: fm.RingTimeout,
                                Destination: rule.DNIS,
                                Domain: rule.IpUrl
                            };

                            if(dodActive && dodNum)
                            {
                                ep.Origination = dodNum;
                                ep.OriginationCallerIdNumber = dodNum;
                            }
                            else
                            {
                                ep.Origination = rule.ANI;
                                ep.OriginationCallerIdNumber = rule.ANI;
                            }

                            epList.push(ep);

                            count++;

                            if(count >= len)
                            {
                                callback(undefined, epList);
                            }
                        }
                        else
                        {
                            count++;

                            if(count >= len)
                            {
                                callback(undefined, epList);
                            }
                        }
                    })
                }
                else
                {
                    backendHandler.GetAllDataForExt(reqId, fm.DestinationNumber, tenantId, 'USER', function (err, extDetails)
                    {

                        if (!err && extDetails)
                        {
                            if (extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                            {
                                var ep =
                                {
                                    Profile: '',
                                    Type: 'USER',
                                    LegStartDelay: 0,
                                    BypassMedia: false,
                                    LegTimeout: 60,
                                    Origination: callerIdName,
                                    OriginationCallerIdNumber: callerIdNum,
                                    Destination: fm.DestinationNumber,
                                    Domain: extDetails.SipUACEndpoint.CloudEndUser.Domain
                                };

                                epList.push(ep);

                                count++;

                                if(count >= len)
                                {
                                    callback(undefined, epList);
                                }
                            }
                            else
                            {
                                count++;

                                if(count >= len)
                                {
                                    callback(undefined, epList);
                                }
                            }
                        }
                        else
                        {
                            count++;

                            if(count >= len)
                            {
                                callback(undefined, epList);
                            }
                        }

                    });
                    //Get User Info for extension

                }
            }
            else
            {
                callback(undefined, epList);
            }
        });
    }
    catch(ex)
    {
        callback(ex, epList);
    }
};

var ProcessCallForwarding = function(reqId, aniNum, dnisNum, callerDomain, context, direction, extraData, companyId, tenantId, disconReason, fwdId, securityToken, callback)
{
    try
    {
        //Get fwd obj from redis
        var profile = '';
        var uuid = '';
        var variableUserId = '';
        var huntDestinationNumber = '';
        var callerIdNum = '';
        var callerIdName = '';


        if(extraData)
        {
            profile = extraData['variable_sofia_profile_name'];
            variableUserId = extraData['variable_user_id'];
            huntDestinationNumber = extraData['Hunt-Destination-Number'];
            uuid = extraData['variable_uuid'];
        }

        redisHandler.GetObject(reqId, fwdId, function(err, redisObj)
        {
            //match discon reason

            if(err)
            {
                callback(err, xmlBuilder.createNotFoundResponse());
            }
            else if(redisObj)
            {
                var fwdList = JSON.parse(redisObj);

                if(fwdList && fwdList.length > 0)
                {
                    var fwdRule = underscore.find(fwdList, function(fwdRecord){return fwdRecord.DisconnectReason === disconReason});

                    if(fwdRule)
                    {
                        if(fwdRule.ObjCategory === 'GATEWAY')
                        {
                            //pick outbound rule
                            ruleHandler.PickCallRuleOutboundComplete(aniNum, fwdRule.Destination, '', context, companyId, tenantId, false, function(err, rule)
                            {
                                if(err)
                                {
                                    callback(err, xmlBuilder.createNotFoundResponse());
                                }
                                else if(rule)
                                {
                                    var ep =
                                    {
                                        Profile: rule.GatewayCode,
                                        Type: 'GATEWAY',
                                        LegStartDelay: 0,
                                        BypassMedia: false,
                                        LegTimeout: rule.Timeout,
                                        Origination: rule.ANI,
                                        OriginationCallerIdNumber: rule.ANI,
                                        Destination: rule.DNIS,
                                        Domain: rule.IpUrl,
                                        OutLimit: rule.OutLimit,
                                        BothLimit: rule.BothLimit,
                                        TrunkNumber: rule.TrunkNumber,
                                        NumberType: rule.NumberType,
                                        CompanyId: rule.CompanyId,
                                        TenantId: rule.TenantId
                                    };
                                    var xml = xmlBuilder.CreateRouteGatewayDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                    callback(undefined, xml);
                                }
                                else
                                {
                                    callback(undefined, xmlBuilder.createNotFoundResponse());
                                }
                            })
                        }
                        else
                        {
                            //pick extension
                            backendHandler.GetAllDataForExt(reqId, fwdRule.Destination, tenantId, 'USER', function(err, extDetails)
                            {
                                if(err)
                                {
                                    callback(err, xmlBuilder.createNotFoundResponse());
                                }
                                else if(extDetails)
                                {
                                    if (extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                                    {
                                        var bypassMedia = pbxObj.BypassMedia;

                                        var grp = '';

                                        var domain = '';

                                        if(extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                                        {
                                            domain = extDetails.SipUACEndpoint.CloudEndUser.Domain;
                                        }

                                        if(extDetails.SipUACEndpoint.UserGroup.length > 0 && extDetails.SipUACEndpoint.UserGroup[0].Extension)
                                        {
                                            grp = extDetails.SipUACEndpoint.UserGroup[0].Extension.Extension;
                                        }

                                        var ep =
                                        {
                                            Profile: '',
                                            Type: 'USER',
                                            LegStartDelay: 0,
                                            BypassMedia: bypassMedia,
                                            LegTimeout: 60,
                                            Origination: callerIdName,
                                            OriginationCallerIdNumber: callerIdNum,
                                            Destination: fwdRule.Destination,
                                            Domain: domain,
                                            Group: grp,
                                            CompanyId: companyId,
                                            TenantId: tenantId
                                        };

                                        var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                        redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                        {
                                            if(!err && redisResult)
                                            {
                                                var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                callback(undefined, xml);
                                            }
                                            else
                                            {
                                                callback(undefined, xmlBuilder.createNotFoundResponse());
                                            }
                                        })


                                    }
                                    else
                                    {
                                        callback(undefined, xmlBuilder.createNotFoundResponse());
                                    }
                                }
                                else
                                {
                                    callback(undefined, xmlBuilder.createNotFoundResponse());
                                }
                            });

                        }
                    }
                }
            }
        })

        //check number type
        //pick extension or rule
        //route to destination

    }
    catch(ex)
    {

    }
}

var ProcessExtendedDialplan = function(reqId, ani, dnis, context, direction, extraData, fromUserData, companyId, tenantId, securityToken, numLimitInfo, callback)
{

    try
    {
        var profile = '';
        var variableUserId = '';
        var huntDestinationNumber = '';
        var callerIdNum = '';
        var callerIdName = '';
        var uuid = '';
        var toFaxType = undefined;
        var fromFaxType = undefined;
        var url = '';

        if(extraData)
        {
            profile = extraData['variable_sofia_profile_name'];
            variableUserId = extraData['Caller-ANI'];
            huntDestinationNumber = extraData['Hunt-Destination-Number'];
            callerIdNum = extraData['Caller-Caller-ID-Number'];
            callerIdName = extraData['Caller-Caller-ID-Name'];
            uuid = extraData['variable_uuid'];
            fromFaxType = extraData['TrunkFaxType'];
            url = extraData['DVPAppUrl'];
        }

        var fromSplitArr = ani.split("@");

        var toSplitArr = dnis.split("@");

        var aniNum = ani;
        var dnisNum = dnis;
        var domain = "";

        if(fromSplitArr.length == 2)
        {
            var domainS = fromSplitArr[1];

            var domainAndPort = domainS.split(":");

            if(domainAndPort.length == 2)
            {
                domain = domainAndPort[0];
            }

            aniNum = fromSplitArr[0];

        }

        if(toSplitArr.length == 2)
        {
            dnisNum = toSplitArr[0];
        }

        //Get ANI DNIS Context

        //Check for DID
        if(direction === 'IN')
        {
            backendHandler.GetExtensionForDid(reqId, dnisNum, companyId, tenantId, function(err, didRes)
            {
                if(err)
                {
                    callback(err, xmlBuilder.createNotFoundResponse());
                }
                else if(didRes && didRes.Extension)
                {
                    logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - DID FOUND', reqId);

                    backendHandler.GetAllDataForExt(reqId, didRes.Extension.Extension, tenantId, didRes.Extension.ObjCategory, function(err, extDetails)
                    {
                        if(err)
                        {
                            //return default xml
                            callback(err, xmlBuilder.createNotFoundResponse());
                        }
                        else if(extDetails)
                        {
                            logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - TO EXTENSION FOUND - TYPE : %s', reqId, extDetails.ObjCategory);
                            toFaxType = extDetails.ExtraData;
                            if(extDetails.ObjCategory === 'USER')
                            {
                                if(extDetails.SipUACEndpoint)
                                {
                                    //Check extension type and handle accordingly
                                    var grp = '';
                                    var toUsrDomain = '';

                                    if(extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                                    {
                                        toUsrDomain = extDetails.SipUACEndpoint.CloudEndUser.Domain;
                                    }

                                    if(extDetails.SipUACEndpoint.UserGroup.length > 0 && extDetails.SipUACEndpoint.UserGroup[0].Extension)
                                    {
                                        grp = extDetails.SipUACEndpoint.UserGroup[0].Extension.Extension;
                                    }

                                    if(url)
                                    {
                                        extApi.RemoteGetDialplanConfig(reqId, ani, dnis, context, direction, extDetails.SipUACEndpoint.SipUserUuid, undefined, extDetails.ObjCategory, undefined, url, securityToken, function(err, pbxDetails)
                                        {
                                            if(err)
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }
                                            else if(!pbxDetails)
                                            {
                                                logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - REMOTE EXTENDED DIALPLAN NOT FOUND', reqId);

                                                var ep =
                                                {
                                                    Profile: profile,
                                                    Type: 'USER',
                                                    LegStartDelay: 0,
                                                    BypassMedia: false,
                                                    LegTimeout: 60,
                                                    Origination: callerIdName,
                                                    OriginationCallerIdNumber: callerIdNum,
                                                    Destination: extDetails.Extension,
                                                    Domain: toUsrDomain,
                                                    Group: grp,
                                                    IsVoicemailEnabled: false,
                                                    PersonalGreeting: undefined,
                                                    CompanyId: companyId,
                                                    TenantId: tenantId
                                                };

                                                var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                {
                                                    if(!err && redisResult)
                                                    {
                                                        logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - NORMAL USER DIAL', reqId);
                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, numLimitInfo);

                                                        callback(undefined, xml);
                                                    }
                                                    else
                                                    {
                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                    }
                                                });
                                            }
                                            else
                                            {
                                                logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - REMOTE EXTENDED DIALPLAN FOUND', reqId);

                                                var pbxObj = pbxDetails;


                                                var voicemailEnabled = pbxObj.VoicemailEnabled;
                                                var personalGreeting = pbxObj.PersonalGreeting;
                                                var bypassMedia = pbxObj.BypassMedia;

                                                logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - OPERATION TYPE : %s', reqId, pbxObj.OperationType);


                                                if(pbxObj.OperationType === 'DND')
                                                {
                                                    var xml = xmlBuilder.CreateSendBusyMessageDialplan(reqId, '[^\\s]*', context, numLimitInfo);

                                                    callback(undefined, xml);
                                                }
                                                else if(pbxObj.OperationType === 'USER_DIAL')
                                                {

                                                    var ep =
                                                    {
                                                        Profile: profile,
                                                        Type: 'USER',
                                                        LegStartDelay: 0,
                                                        BypassMedia: bypassMedia,
                                                        LegTimeout: 60,
                                                        Origination: callerIdName,
                                                        OriginationCallerIdNumber: callerIdNum,
                                                        Destination: extDetails.Extension,
                                                        Domain: toUsrDomain,
                                                        Group: grp,
                                                        IsVoicemailEnabled: voicemailEnabled,
                                                        PersonalGreeting: personalGreeting,
                                                        CompanyId: companyId,
                                                        TenantId: tenantId
                                                    };

                                                    var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                    redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                    {
                                                        if(!err && redisResult)
                                                        {
                                                            var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, numLimitInfo);

                                                            callback(undefined, xml);
                                                        }
                                                        else
                                                        {
                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                        }
                                                    });
                                                }
                                                else if(pbxObj.OperationType === 'FOLLOW_ME')
                                                {
                                                    if(pbxDetails.Endpoints && pbxDetails.Endpoints.length > 0)
                                                    {
                                                        CreateFMEndpointList(reqId, aniNum, context, companyId, tenantId, pbxDetails.Endpoints, '', false, callerIdNum, callerIdName, function(err, epList)
                                                        {
                                                            if(err)
                                                            {
                                                                callback(err, xmlBuilder.createNotFoundResponse());
                                                            }
                                                            else if(epList && epList.length > 0)
                                                            {
                                                                var xml = xmlBuilder.CreateFollowMeDialplan(reqId, epList, context, profile, '[^\\s]*', false, numLimitInfo);

                                                                callback(undefined, xml);
                                                            }
                                                            else
                                                            {
                                                                callback(err, xmlBuilder.createNotFoundResponse());
                                                            }
                                                        })
                                                    }
                                                }
                                                else if(pbxObj.OperationType === 'FORWARD')
                                                {
                                                    if(pbxDetails.Forwarding)
                                                    {
                                                        var ep =
                                                        {
                                                            Profile: profile,
                                                            Type: 'USER',
                                                            LegStartDelay: 0,
                                                            BypassMedia: bypassMedia,
                                                            LegTimeout: 60,
                                                            Origination: callerIdName,
                                                            OriginationCallerIdNumber: callerIdNum,
                                                            Destination: extDetails.Extension,
                                                            Domain: domain,
                                                            Group: grp,
                                                            CompanyId: companyId,
                                                            TenantId: tenantId
                                                        };

                                                        var pbxFwdKey = util.format('DVPFORWARDING_%d_%d_%s', companyId, tenantId, pbxDetails.UserUuid);
                                                        var forwardingInfo = JSON.stringify(pbxDetails.Endpoints);

                                                        redisHandler.SetObjectWithExpire(pbxFwdKey, forwardingInfo, 200000, function(err, redisResp)
                                                        {
                                                            if(err)
                                                            {
                                                                callback(err, xmlBuilder.createNotFoundResponse());
                                                            }
                                                            else
                                                            {
                                                                var xml = xmlBuilder.CreateForwardingDialplan(reqId, ep, context, profile, '[^\\s]*', false, pbxFwdKey, numLimitInfo);

                                                                callback(undefined, xml);
                                                            }
                                                        });
                                                    }

                                                }
                                                else if(pbxObj.OperationType === 'CALL_DIVERT')
                                                {
                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                }
                                                else
                                                {
                                                    logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - UNSUPPORTED OPERATION TYPE - TRYING NORMAL USER DIAL', reqId);
                                                    if(extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                                                    {
                                                        domain = extDetails.SipUACEndpoint.CloudEndUser.Domain;
                                                    }

                                                    if(extDetails.SipUACEndpoint.UserGroup.length > 0 && extDetails.SipUACEndpoint.UserGroup[0].Extension)
                                                    {
                                                        grp = extDetails.SipUACEndpoint.UserGroup[0].Extension.Extension;
                                                    }

                                                    var ep =
                                                    {
                                                        Profile: profile,
                                                        Type: 'USER',
                                                        LegStartDelay: 0,
                                                        BypassMedia: bypassMedia,
                                                        LegTimeout: 60,
                                                        Origination: callerIdName,
                                                        OriginationCallerIdNumber: callerIdNum,
                                                        Destination: extDetails.Extension,
                                                        Domain: toUsrDomain,
                                                        Group: grp,
                                                        IsVoicemailEnabled: voicemailEnabled,
                                                        PersonalGreeting: personalGreeting,
                                                        CompanyId: companyId,
                                                        TenantId: tenantId
                                                    };

                                                    var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                    redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                    {
                                                        if(!err && redisResult)
                                                        {
                                                            var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, numLimitInfo);

                                                            callback(undefined, xml);
                                                        }
                                                        else
                                                        {
                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    }
                                    else
                                    {
                                        logger.info('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - APP URL NOT SET - TRYING NORMAL USER DIAL', reqId);

                                        var ep =
                                        {
                                            Profile: profile,
                                            Type: 'USER',
                                            LegStartDelay: 0,
                                            BypassMedia: false,
                                            LegTimeout: 60,
                                            Origination: callerIdName,
                                            OriginationCallerIdNumber: callerIdNum,
                                            Destination: extDetails.Extension,
                                            Domain: toUsrDomain,
                                            Group: undefined,
                                            IsVoicemailEnabled: false,
                                            PersonalGreeting: false,
                                            CompanyId: companyId,
                                            TenantId: tenantId
                                        };

                                        var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                        redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                        {
                                            if(!err && redisResult)
                                            {
                                                var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, numLimitInfo);

                                                callback(undefined, xml);
                                            }
                                            else
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }
                                        });
                                    }

                                }
                                else
                                {
                                    logger.error('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - SipUACEndpoint not found for extension', reqId);
                                    callback(new Error('SipUACEndpoint not found for extension'), xmlBuilder.createNotFoundResponse());
                                }

                            }
                            else if(extDetails.ObjCategory === 'FAX')
                            {
                                if(toFaxType && fromFaxType)
                                {
                                    //Route Fax Dialplan
                                    var ep =
                                    {
                                        Profile: profile,
                                        Type: 'USER',
                                        LegStartDelay: 0,
                                        BypassMedia: false,
                                        LegTimeout: 60,
                                        Origination: callerIdName,
                                        OriginationCallerIdNumber: callerIdNum,
                                        Destination: dnisNum,
                                        Domain: domain,
                                        CompanyId: companyId,
                                        TenantId: tenantId
                                    };

                                    var xml = xmlBuilder.CreateRouteFaxUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, fromFaxType, toFaxType);

                                    callback(undefined, xml);


                                }
                                else
                                {
                                    callback(new Error('fax types not set'), xmlBuilder.createNotFoundResponse());
                                }

                            }
                            else if(extDetails.ObjCategory === 'GROUP')
                            {
                                if(extDetails.Extension.UserGroup)
                                {
                                    var ep =
                                    {
                                        Profile: profile,
                                        Type: 'GROUP',
                                        LegStartDelay: 0,
                                        BypassMedia: false,
                                        LegTimeout: 60,
                                        Origination: callerIdName,
                                        OriginationCallerIdNumber: callerIdNum,
                                        Destination: extDetails.Extension,
                                        Domain: extDetails.Extension.UserGroup.Domain,
                                        Group: extDetails.Extension,
                                        CompanyId: companyId,
                                        TenantId: tenantId
                                    };

                                    var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                    redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                    {
                                        if (!err && redisResult)
                                        {
                                            var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, numLimitInfo);
                                            callback(undefined, xml);
                                        }
                                        else
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }
                                    });


                                }
                                else
                                {
                                    callback(err, xmlBuilder.createNotFoundResponse());
                                }


                            }
                            else if(extDetails.ObjCategory === 'CONFERENCE')
                            {
                                //call conference handler
                                conferenceHandler.ConferenceHandlerOperation(reqId, extDetails, direction, '', context, profile, companyId, tenantId, function(err, confXml)
                                {
                                    callback(err, confXml);
                                })
                            }
                            else
                            {
                                callback(err, xmlBuilder.createNotFoundResponse());
                            }

                        }
                        else
                        {

                            callback(new Error('Extension not found'), xmlBuilder.createNotFoundResponse());

                        }
                    });
                }
                else
                {
                    //Check for fax passthru
                    callback(err, xmlBuilder.createNotFoundResponse());
                }
            })
        }
        else
        {
            //Get From User

                if(fromUserData)
                {
                    var fromUserUuid = fromUserData.SipUserUuid;

                    if(fromUserData.Extension && fromUserData.Extension.ObjCategory === 'FAX')
                    {
                        fromFaxType = fromUserData.Extension.ExtraData;
                    }

                    //Get to user
                    backendHandler.GetExtensionDB(reqId, dnisNum, tenantId, function(err, extInfo)
                    {
                        if(err)
                        {
                            callback(err, xmlBuilder.createNotFoundResponse());
                        }
                        else if(extInfo)
                        {
                            backendHandler.GetAllDataForExt(reqId, dnisNum, tenantId, extInfo.ObjCategory, function(err, extDetails)
                            {
                                if(err)
                                {
                                    //return default xml
                                    callback(err, xmlBuilder.createNotFoundResponse());
                                }
                                else if(extDetails)
                                {
                                    toFaxType = extDetails.ExtraData;
                                    if(extDetails.ObjCategory === 'USER')
                                    {
                                        if(extDetails.SipUACEndpoint)
                                        {
                                            var grp = '';
                                            var toUsrDomain = '';

                                            if(extDetails.SipUACEndpoint && extDetails.SipUACEndpoint.CloudEndUser)
                                            {
                                                toUsrDomain = extDetails.SipUACEndpoint.CloudEndUser.Domain;
                                            }

                                            if(extDetails.SipUACEndpoint.UserGroup.length > 0 && extDetails.SipUACEndpoint.UserGroup[0].Extension)
                                            {
                                                grp = extDetails.SipUACEndpoint.UserGroup[0].Extension.Extension;
                                            }

                                            if(url)
                                            {
                                                //Check extension type and handle accordingly
                                                extApi.RemoteGetDialplanConfig(reqId, ani, dnis, context, direction, extDetails.SipUACEndpoint.SipUserUuid, fromUserUuid, extDetails.ObjCategory, undefined, url, securityToken, function(err, pbxDetails)
                                                {
                                                    if(err)
                                                    {
                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                    }
                                                    else if(!pbxDetails)
                                                    {

                                                        var ep =
                                                        {
                                                            Profile: profile,
                                                            Type: 'USER',
                                                            LegStartDelay: 0,
                                                            BypassMedia: false,
                                                            LegTimeout: 60,
                                                            Origination: callerIdName,
                                                            OriginationCallerIdNumber: callerIdNum,
                                                            Destination: extDetails.Extension,
                                                            Domain: toUsrDomain,
                                                            Group: grp,
                                                            IsVoicemailEnabled: false,
                                                            PersonalGreeting: undefined,
                                                            CompanyId: companyId,
                                                            TenantId: tenantId
                                                        };

                                                        var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                        redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                        {
                                                            if(!err && redisResult)
                                                            {
                                                                var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, undefined);

                                                                callback(undefined, xml);
                                                            }
                                                            else
                                                            {
                                                                callback(err, xmlBuilder.createNotFoundResponse());
                                                            }
                                                        });
                                                    }
                                                    else
                                                    {
                                                        var pbxObj = JSON.parse(pbxDetails);

                                                        if(pbxObj)
                                                        {

                                                            var voicemailEnabled = pbxObj.VoicemailEnabled;
                                                            var personalGreeting = pbxObj.PersonalGreeting;
                                                            var bypassMedia = pbxObj.BypassMedia;

                                                            var dodNumber = pbxObj.DodNumber;
                                                            var dodActive = pbxObj.DodActive;


                                                            if(pbxObj.OperationType === 'DND')
                                                            {
                                                                var xml = xmlBuilder.CreateSendBusyMessageDialplan(reqId, '[^\\s]*', context, undefined);

                                                                callback(undefined, xml);
                                                            }
                                                            else if(pbxObj.OperationType === 'USER_DIAL')
                                                            {


                                                                var ep =
                                                                {
                                                                    Profile: profile,
                                                                    Type: 'USER',
                                                                    LegStartDelay: 0,
                                                                    BypassMedia: bypassMedia,
                                                                    LegTimeout: 60,
                                                                    Origination: callerIdName,
                                                                    OriginationCallerIdNumber: callerIdNum,
                                                                    Destination: extDetails.Extension,
                                                                    Domain: toUsrDomain,
                                                                    Group: grp,
                                                                    IsVoicemailEnabled: voicemailEnabled,
                                                                    PersonalGreeting: personalGreeting,
                                                                    CompanyId: companyId,
                                                                    TenantId: tenantId
                                                                };

                                                                var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                                redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                                {
                                                                    if(!err && redisResult)
                                                                    {
                                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, undefined);

                                                                        callback(undefined, xml);
                                                                    }
                                                                    else
                                                                    {
                                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                                    }
                                                                });
                                                            }
                                                            else if(pbxObj.OperationType === 'FOLLOW_ME')
                                                            {
                                                                if(pbxDetails.Endpoints && pbxDetails.Endpoints.length > 0)
                                                                {
                                                                    CreateFMEndpointList(reqId, aniNum, context, companyId, tenantId, pbxDetails.Endpoints, '', false, callerIdNum, callerIdName, function(err, epList)
                                                                    {
                                                                        if(err)
                                                                        {
                                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                                        }
                                                                        else if(epList && epList.length > 0)
                                                                        {
                                                                            var xml = xmlBuilder.CreateFollowMeDialplan(reqId, epList, context, profile, '[^\\s]*', false, undefined);

                                                                            callback(undefined, xml);
                                                                        }
                                                                        else
                                                                        {
                                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                                        }
                                                                    })
                                                                }
                                                            }
                                                            else if(pbxObj.OperationType === 'FORWARD')
                                                            {
                                                                if(pbxDetails.Endpoints)
                                                                {
                                                                    var ep =
                                                                    {
                                                                        Profile: profile,
                                                                        Type: 'USER',
                                                                        LegStartDelay: 0,
                                                                        BypassMedia: bypassMedia,
                                                                        LegTimeout: 60,
                                                                        Origination: callerIdName,
                                                                        OriginationCallerIdNumber: callerIdNum,
                                                                        Destination: dnisNum,
                                                                        Domain: domain,
                                                                        Group: grp,
                                                                        CompanyId: companyId,
                                                                        TenantId: tenantId
                                                                    };

                                                                    var pbxFwdKey = util.format('DVPFORWARDING_%d_%d_%s', companyId, tenantId, pbxDetails.UserUuid);
                                                                    var forwardingInfo = JSON.stringify(pbxDetails.Endpoints);

                                                                    redisHandler.SetObjectWithExpire(pbxFwdKey, forwardingInfo, 200000, function(err, redisResp)
                                                                    {
                                                                        if(err)
                                                                        {
                                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                                        }
                                                                        else
                                                                        {
                                                                            var xml = xmlBuilder.CreateForwardingDialplan(reqId, ep, context, profile, '[^\\s]*', false, pbxFwdKey, undefined);

                                                                            callback(undefined, xml);
                                                                        }
                                                                    });
                                                                }

                                                            }
                                                            else if(pbxObj.OperationType === 'CALL_DIVERT')
                                                            {
                                                                callback(err, xmlBuilder.createNotFoundResponse());
                                                            }
                                                            else
                                                            {

                                                                var ep =
                                                                {
                                                                    Profile: profile,
                                                                    Type: 'USER',
                                                                    LegStartDelay: 0,
                                                                    BypassMedia: bypassMedia,
                                                                    LegTimeout: 60,
                                                                    Origination: callerIdName,
                                                                    OriginationCallerIdNumber: callerIdNum,
                                                                    Destination: dnisNum,
                                                                    Domain: toUsrDomain,
                                                                    Group: grp,
                                                                    IsVoicemailEnabled: voicemailEnabled,
                                                                    PersonalGreeting: personalGreeting,
                                                                    CompanyId: companyId,
                                                                    TenantId: tenantId
                                                                };

                                                                var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                                redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                                {
                                                                    if(!err && redisResult)
                                                                    {
                                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, undefined);

                                                                        callback(undefined, xml);
                                                                    }
                                                                    else
                                                                    {
                                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                                    }
                                                                });
                                                            }

                                                        }
                                                        else
                                                        {
                                                            callback(err, xmlBuilder.createNotFoundResponse());
                                                        }
                                                    }
                                                })
                                            }
                                            else
                                            {

                                                var ep =
                                                {
                                                    Profile: profile,
                                                    Type: 'USER',
                                                    LegStartDelay: 0,
                                                    BypassMedia: false,
                                                    LegTimeout: 60,
                                                    Origination: callerIdName,
                                                    OriginationCallerIdNumber: callerIdNum,
                                                    Destination: extDetails.Extension,
                                                    Domain: toUsrDomain,
                                                    Group: grp,
                                                    IsVoicemailEnabled: false,
                                                    PersonalGreeting: undefined,
                                                    CompanyId: companyId,
                                                    TenantId: tenantId
                                                };

                                                var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                                redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                                {
                                                    if(!err && redisResult)
                                                    {
                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, undefined);

                                                        callback(undefined, xml);
                                                    }
                                                    else
                                                    {
                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                    }
                                                });
                                            }

                                        }
                                        else
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }

                                    }
                                    else if(extDetails.ObjCategory === 'FAX')
                                    {
                                        if(fromFaxType && toFaxType)
                                        {
                                            //process fax dialplan
                                        }
                                        else
                                        {
                                            callback(new Error('fax types not set'), xmlBuilder.createNotFoundResponse());
                                        }
                                    }
                                    else if(extDetails.ObjCategory === 'GROUP')
                                    {
                                        if(extDetails.Extension.UserGroup)
                                        {
                                            var ep =
                                            {
                                                Profile: profile,
                                                Type: 'GROUP',
                                                LegStartDelay: 0,
                                                BypassMedia: false,
                                                LegTimeout: 60,
                                                Origination: callerIdName,
                                                OriginationCallerIdNumber: callerIdNum,
                                                Destination: extDetails.Extension,
                                                Domain: extDetails.Extension.UserGroup.Domain,
                                                Group: extDetails.Extension,
                                                CompanyId: companyId,
                                                TenantId: tenantId
                                            };

                                            var customStr = tenantId + '_' + extDetails.Extension + '_PBXUSERCALL';

                                            redisHandler.SetObjectWithExpire(customStr, uuid, 60, function(err, redisResult)
                                            {
                                                if (!err && redisResult)
                                                {
                                                    var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false, undefined);
                                                    callback(undefined, xml);
                                                }
                                                else
                                                {
                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                }
                                            });


                                        }
                                        else
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }


                                    }
                                    else if(extDetails.ObjCategory === 'CONFERENCE')
                                    {
                                        conferenceHandler.ConferenceHandlerOperation(reqId, extDetails, direction, fromUserUuid, context, profile, companyId, tenantId, function(err, confXml)
                                        {
                                            callback(err, confXml);
                                        })
                                    }
                                    else if(extDetails.ObjCategory === 'VOICE_PORTAL')
                                    {
                                        extApi.RemoteGetDialplanConfig(reqId, ani, dnis, context, direction, undefined, fromUserUuid, extDetails.ObjCategory, extDetails.ExtraData, url, securityToken, function(err, pbxDetails)
                                        {
                                            if(err)
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }
                                            else if(pbxDetails)
                                            {
                                                if(pbxDetails.OperationType === 'DIALPLAN')
                                                {
                                                    callback(undefined, pbxDetails.Dialplan);
                                                }
                                            }
                                            else
                                            {
                                                callback(new Error('PBX app returned empty value'), xmlBuilder.createNotFoundResponse());
                                            }

                                        });

                                    }
                                    else
                                    {
                                        callback(new Error('Unsupported extension category'), xmlBuilder.createNotFoundResponse());
                                    }

                                }
                                else
                                {
                                    callback(new Error('Unsupported extension'), xmlBuilder.createNotFoundResponse());

                                }
                            });
                        }
                        else
                        {

                            extApi.RemoteGetDialplanConfig(reqId, ani, dnis, context, direction, undefined, variableUserId, undefined, undefined, url, securityToken, function(err, pbxDetails)
                            {
                                if(err || !pbxDetails)
                                {
                                    callback(err, xmlBuilder.createNotFoundResponse());
                                }
                                else
                                {
                                    var pbxObj = JSON.parse(pbxDetails);

                                    if(pbxObj)
                                    {
                                        var operationType = pbxObj.OperationType;
                                        var voicemailEnabled = pbxObj.VoicemailEnabled;
                                        var bypassMedia = pbxObj.BypassMedia;

                                        var dodNumber = undefined;
                                        var dodActive = undefined;

                                        var grp = '';

                                        var domain = '';


                                        if(operationType === 'GATEWAY')
                                        {
                                            //xml DND response
                                            ruleHandler.PickCallRuleOutboundComplete(aniNum, dnisNum, '', context, companyId, tenantId, true, function(err, rule)
                                            {
                                                if(err)
                                                {
                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                }
                                                else if(rule)
                                                {
                                                    if(rule.FaxType)
                                                    {
                                                        toFaxType = rule.FaxType;
                                                    }
                                                    var ep =
                                                    {
                                                        Profile: rule.GatewayCode,
                                                        Type: 'GATEWAY',
                                                        LegStartDelay: 0,
                                                        BypassMedia: false,
                                                        LegTimeout: rule.Timeout,
                                                        Origination: rule.ANI,
                                                        OriginationCallerIdNumber: rule.ANI,
                                                        Destination: rule.DNIS,
                                                        Domain: rule.IpUrl,
                                                        OutLimit: rule.OutLimit,
                                                        BothLimit: rule.BothLimit,
                                                        TrunkNumber: rule.TrunkNumber,
                                                        NumberType: rule.NumberType,
                                                        CompanyId: rule.CompanyId,
                                                        TenantId: rule.TenantId
                                                    };

                                                    if(toFaxType)
                                                    {
                                                        //gateway fax dialplan
                                                        var xml = xmlBuilder.CreateRouteFaxGatewayDialplan(reqId, ep, context, profile, '[^\\s]*', false, fromFaxType, toFaxType);
                                                        callback(undefined, xml);
                                                    }
                                                    else
                                                    {
                                                        var xml = xmlBuilder.CreateRouteGatewayDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                        callback(undefined, xml);
                                                    }

                                                }
                                                else
                                                {
                                                    callback(undefined, xmlBuilder.createNotFoundResponse());
                                                }
                                            })
                                        }
                                        else if(operationType === 'PICKUP')
                                        {
                                            var extraData = pbxObj.ExtraData;

                                            if(extraData)
                                            {
                                                var xml = xmlBuilder.CreatePickUpDialplan(reqId, extraData, context, '[^\\s]*');
                                                callback(undefined, xml);
                                            }
                                            else
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }

                                        }
                                        else if(operationType === 'PARK')
                                        {
                                            var extraData = pbxObj.ExtraData;

                                            if(extraData)
                                            {
                                                var xml = xmlBuilder.CreateParkDialplan(reqId, extraData, context, '[^\\s]*', extraData);
                                                callback(undefined, xml);
                                            }
                                            else
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }

                                        }
                                        else if(operationType === 'INTERCEPT')
                                        {
                                            var extraData = pbxObj.ExtraData;

                                            var redisKey = tenantId + '_' + extraData + '_PBXUSERCALL';

                                            redisHandler.GetObject(reqId, redisKey, function(err, redisResult)
                                            {
                                                if(!err && redisResult)
                                                {
                                                    var xml = xmlBuilder.CreateInterceptDialplan(reqId, redisResult, context, '[^\\s]*');
                                                    callback(undefined, xml);
                                                }
                                                else
                                                {
                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                }
                                            })

                                        }
                                        else if(operationType === 'BARGE')
                                        {
                                            var extraData = pbxObj.ExtraData;

                                            var redisKey = tenantId + '_' + extraData + '_PBXUSERCALL';

                                            redisHandler.GetObject(reqId, redisKey, function(err, redisResult)
                                            {
                                                if(!err && redisResult)
                                                {
                                                    var xml = xmlBuilder.CreateBargeDialplan(reqId, redisResult, context, '[^\\s]*', true);
                                                    callback(undefined, xml);
                                                }
                                                else
                                                {
                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                }
                                            })

                                        }
                                        else if(operationType === 'VOICEMAIL')
                                        {
                                            var extraData = pbxObj.ExtraData;

                                            if(extraData)
                                            {
                                                backendHandler.GetAllUserDataForExt(reqId, extraData, tenantId, 'USER', function(err, extDetails)
                                                {
                                                    if(err || !extDetails || !extDetails.SipUACEndpoint || !extDetails.SipUACEndpoint.CloudEndUser)
                                                    {
                                                        callback(err, xmlBuilder.createNotFoundResponse());
                                                    }
                                                    else
                                                    {
                                                        var xml = xmlBuilder.CreateVoicemailDialplan(reqId, extraData, context, '[^\\s]*', extDetails.SipUACEndpoint.CloudEndUser.Domain);
                                                        callback(undefined, xml);
                                                    }
                                                });

                                            }
                                            else
                                            {
                                                callback(err, xmlBuilder.createNotFoundResponse());
                                            }

                                        }
                                        else
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }

                                    }
                                    else
                                    {
                                        callback(err, xmlBuilder.createNotFoundResponse());
                                    }
                                }
                            })

                        }
                    })
                }
                else
                {
                    callback(new Error('From User Not Found'), xmlBuilder.createNotFoundResponse());
                }

        }


        //Call SIP UAC Service and pass dnis and security token to get sip uac info
        //if uac record found get the relevant pbx configuration
        //if uac record
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - Exception Occurred', reqId, ex);
        var jsonString = messageFormatter.FormatMessage(ex, "Exception occurred", false, false);
        logger.debug('[DVP-DynamicConfigurationGenerator.ProcessExtendedDialplan] - [%s] - API RESPONSE : %s', reqId, jsonString);
        res.end(jsonString);

    }
}

module.exports.ProcessExtendedDialplan = ProcessExtendedDialplan;
module.exports.ProcessCallForwarding = ProcessCallForwarding;