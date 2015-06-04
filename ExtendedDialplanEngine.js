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

var CreateFMEndpointList = function(reqId, aniNum, context, companyId, tenantId, fmList, dodNum, dodActive, callback)
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
                    ruleBackendHandler.PickCallRuleOutboundComplete(aniNum, fm.DestinationNumber, '', context, companyId, tenantId, false, function (err, rule)
                    {
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
                                Domain: rule.Domain
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
                    })
                }
                else
                {
                    backendHandler.GetAllUserDataForExt(reqId, fm.DestinationNumber, tenantId, function (err, extDetails)
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
                                    Origination: variableUserId,
                                    OriginationCallerIdNumber: variableUserId,
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
        var variableUserId = '';
        var huntDestinationNumber = '';
        var originationCallerIdNum = '';

        if(extraData)
        {
            profile = extraData['variable_sofia_profile_name'];
            variableUserId = extraData['variable_user_id'];
            huntDestinationNumber = extraData['Hunt-Destination-Number'];
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
                                        Domain: rule.Domain
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
                                        var voicemailEnabled = pbxObj.VoicemailEnabled;
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
                                            Origination: variableUserId,
                                            OriginationCallerIdNumber: variableUserId,
                                            Destination: fwdRule.Destination,
                                            Domain: domain,
                                            Group: grp,
                                            IsVoicemailEnabled: voicemailEnabled,
                                            CompanyId: companyId,
                                            TenantId: tenantId
                                        };

                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                        callback(undefined, xml);
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

var ProcessExtendedDialplan = function(reqId, ani, dnis, context, direction, extraData, companyId, tenantId, securityToken, callback)
{

    try
    {
        var profile = '';
        var variableUserId = '';
        var huntDestinationNumber = '';
        var originationCallerIdNum = '';

        if(extraData)
        {
            profile = extraData['variable_sofia_profile_name'];
            variableUserId = extraData['variable_user_id'];
            huntDestinationNumber = extraData['Hunt-Destination-Number'];
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
                    backendHandler.GetAllDataForExt(reqId, didRes.Extension.Extension, tenantId, didRes.Extension.ObjCategory, function(err, extDetails)
                    {
                        if(err)
                        {
                            //return default xml
                            callback(err, xmlBuilder.createNotFoundResponse());
                        }
                        else if(extDetails)
                        {
                            if(extDetails.ObjCategory === 'USER')
                            {
                                if(extDetails.SipUACEndpoint)
                                {
                                    //Check extension type and handle accordingly
                                    extApi.RemoteGetPBXDialplanConfig(reqId, ani, dnis, context, direction, extDetails.SipUACEndpoint.SipUserUuid, securityToken, function(err, pbxDetails)
                                    {
                                        if(err || !pbxDetails)
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }
                                        else
                                        {
                                            var pbxObj = JSON.parse(pbxDetails);

                                            if(pbxObj.PBXUserTemplate)
                                            {
                                                var usrStatus = pbxObj.PBXUserTemplate.UserStatus;
                                                var advancedMethod = pbxObj.PBXUserTemplate.AdvancedRouteMethod;
                                                var voicemailEnabled = pbxObj.VoicemailEnabled;
                                                var bypassMedia = pbxObj.BypassMedia;

                                                var dodNumber = undefined;
                                                var dodActive = undefined;

                                                if(direction === 'OUT')
                                                {
                                                    dodNumber = pbxObj.DodNumber;
                                                    dodActive = pbxObj.DodActive;
                                                }

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
                                                if(usrStatus === 'DND')
                                                {
                                                    //xml DND response
                                                    var xml = xmlBuilder.CreateSendBusyMessageDialplan(reqId, '[^\\s]*', context);

                                                    res.end(xml);
                                                }
                                                else if(usrStatus === 'AVAILABLE')
                                                {
                                                    //normal user xml

                                                    if(advancedMethod === 'FOLLOW_ME')
                                                    {
                                                        //Get follow me config and create xml
                                                        if(pbxDetails.FollowMe && pbxDetails.FollowMe.length > 0)
                                                        {
                                                            CreateFMEndpointList(reqId, aniNum, context, companyId, tenantId, pbxDetails.FollowMe, dodNumber, dodActive, function(err, epList)
                                                            {
                                                                if(err)
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                                else if(epList && epList.length > 0)
                                                                {
                                                                    var xml = xmlBuilder.CreateFollowMeDialplan(reqId, epList, context, profile, '[^\\s]*', false);

                                                                    callback(undefined, xml);
                                                                }
                                                                else
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                            })
                                                        }
                                                    }
                                                    else if(advancedMethod === 'FORWARD')
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
                                                                Origination: variableUserId,
                                                                OriginationCallerIdNumber: variableUserId,
                                                                Destination: dnisNum,
                                                                Domain: domain,
                                                                Group: grp,
                                                                CompanyId: companyId,
                                                                TenantId: tenantId,
                                                                DodNumber: dodNumber,
                                                                DodActive: dodActive
                                                            };

                                                            var pbxFwdKey = util.format('DVPFORWARDING_%d_%d_%s', companyId, tenantId, pbxDetails.UserUuid);
                                                            var forwardingInfo = JSON.stringify(pbxDetails.Forwarding);

                                                            redisHandler.SetObjectWithExpire(pbxFwdKey, forwardingInfo, 200000, function(err, redisResp)
                                                            {
                                                                if(err)
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                                else
                                                                {
                                                                    var xml = xmlBuilder.CreateForwardingDialplan(reqId, ep, context, profile, '[^\\s]*', false, pbxFwdKey);

                                                                    callback(undefined, xml);
                                                                }
                                                            });
                                                        }


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
                                                            Origination: variableUserId,
                                                            OriginationCallerIdNumber: variableUserId,
                                                            Destination: dnisNum,
                                                            Domain: domain,
                                                            Group: grp,
                                                            CompanyId: companyId,
                                                            TenantId: tenantId
                                                        };

                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                        callback(undefined, xml);
                                                        //normal user xml
                                                    }
                                                }
                                                else if(userStatus === 'CALL_DIVERT')
                                                {
                                                    //pick outbound rule and create outbound gateway xml
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
                                                        Origination: variableUserId,
                                                        OriginationCallerIdNumber: variableUserId,
                                                        Destination: dnisNum,
                                                        Domain: domain,
                                                        Group: grp,
                                                        CompanyId: companyId,
                                                        TenantId: tenantId
                                                    };

                                                    var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                    callback(undefined, xml);
                                                    //normal user xml
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
                                    callback(err, xmlBuilder.createNotFoundResponse());
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
                                        Origination: variableUserId,
                                        OriginationCallerIdNumber: variableUserId,
                                        Destination: extDetails.Extension,
                                        Domain: extDetails.Extension.UserGroup.Domain,
                                        Group: extDetails.Extension,
                                        CompanyId: companyId,
                                        TenantId: tenantId
                                    };

                                    var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);
                                    callback(undefined, xml);
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
                            if(direction === 'OUT')
                            {
                                //pick outbound rule
                            }
                            else
                            {
                                res.end(xmlBuilder.createNotFoundResponse());
                            }

                        }
                    });
                }
                else
                {
                    callback(err, xmlBuilder.createNotFoundResponse());
                }
            })
        }
        else
        {
            //get extension
            backendHandler.GetExtensionDB(reqId, dnisNum, tenantId, function(err, extInfo)
            {
                if(err)
                {
                    callback(err, xmlBuilder.createNotFoundResponse());
                }
                else if(extInfo)
                {
                    backendHandler.GetAllUserDataForExt(reqId, dnisNum, tenantId, extInfo.ObjCategory, function(err, extDetails)
                    {
                        if(err)
                        {
                            //return default xml
                            callback(err, xmlBuilder.createNotFoundResponse());
                        }
                        else if(extDetails)
                        {
                            if(extDetails.ObjCategory === 'USER')
                            {
                                if(extDetails.SipUACEndpoint)
                                {
                                    //Check extension type and handle accordingly
                                    extApi.RemoteGetPBXDialplanConfig(reqId, ani, dnis, context, direction, extDetails.SipUACEndpoint.SipUserUuid, securityToken, function(err, pbxDetails)
                                    {
                                        if(err || !pbxDetails)
                                        {
                                            callback(err, xmlBuilder.createNotFoundResponse());
                                        }
                                        else
                                        {
                                            var pbxObj = JSON.parse(pbxDetails);

                                            if(pbxObj.PBXUserTemplate)
                                            {
                                                var usrStatus = pbxObj.PBXUserTemplate.UserStatus;
                                                var advancedMethod = pbxObj.PBXUserTemplate.AdvancedRouteMethod;
                                                var voicemailEnabled = pbxObj.VoicemailEnabled;
                                                var bypassMedia = pbxObj.BypassMedia;

                                                var dodNumber = undefined;
                                                var dodActive = undefined;

                                                if(direction === 'OUT')
                                                {
                                                    dodNumber = pbxObj.DodNumber;
                                                    dodActive = pbxObj.DodActive;
                                                }

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
                                                if(usrStatus === 'DND')
                                                {
                                                    //xml DND response
                                                    var xml = xmlBuilder.CreateSendBusyMessageDialplan(reqId, '[^\\s]*', context);

                                                    res.end(xml);
                                                }
                                                else if(usrStatus === 'AVAILABLE')
                                                {
                                                    //normal user xml

                                                    if(advancedMethod === 'FOLLOW_ME')
                                                    {
                                                        //Get follow me config and create xml
                                                        if(pbxDetails.FollowMe && pbxDetails.FollowMe.length > 0)
                                                        {
                                                            CreateFMEndpointList(reqId, aniNum, context, companyId, tenantId, pbxDetails.FollowMe, dodNumber, dodActive, function(err, epList)
                                                            {
                                                                if(err)
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                                else if(epList && epList.length > 0)
                                                                {
                                                                    var xml = xmlBuilder.CreateFollowMeDialplan(reqId, epList, context, profile, '[^\\s]*', false);

                                                                    callback(undefined, xml);
                                                                }
                                                                else
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                            })
                                                        }
                                                    }
                                                    else if(advancedMethod === 'FORWARD')
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
                                                                Origination: variableUserId,
                                                                OriginationCallerIdNumber: variableUserId,
                                                                Destination: dnisNum,
                                                                Domain: domain,
                                                                Group: grp,
                                                                CompanyId: companyId,
                                                                TenantId: tenantId,
                                                                DodNumber: dodNumber,
                                                                DodActive: dodActive
                                                            };

                                                            var pbxFwdKey = util.format('DVPFORWARDING_%d_%d_%s', companyId, tenantId, pbxDetails.UserUuid);
                                                            var forwardingInfo = JSON.stringify(pbxDetails.Forwarding);

                                                            redisHandler.SetObjectWithExpire(pbxFwdKey, forwardingInfo, 200000, function(err, redisResp)
                                                            {
                                                                if(err)
                                                                {
                                                                    callback(err, xmlBuilder.createNotFoundResponse());
                                                                }
                                                                else
                                                                {
                                                                    var xml = xmlBuilder.CreateForwardingDialplan(reqId, ep, context, profile, '[^\\s]*', false, pbxFwdKey);

                                                                    callback(undefined, xml);
                                                                }
                                                            });
                                                        }


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
                                                            Origination: variableUserId,
                                                            OriginationCallerIdNumber: variableUserId,
                                                            Destination: dnisNum,
                                                            Domain: domain,
                                                            Group: grp,
                                                            CompanyId: companyId,
                                                            TenantId: tenantId
                                                        };

                                                        var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                        callback(undefined, xml);
                                                        //normal user xml
                                                    }
                                                }
                                                else if(userStatus === 'CALL_DIVERT')
                                                {
                                                    //pick outbound rule and create outbound gateway xml
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
                                                        Origination: variableUserId,
                                                        OriginationCallerIdNumber: variableUserId,
                                                        Destination: dnisNum,
                                                        Domain: domain,
                                                        Group: grp,
                                                        CompanyId: companyId,
                                                        TenantId: tenantId
                                                    };

                                                    var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);

                                                    callback(undefined, xml);
                                                    //normal user xml
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
                                    callback(err, xmlBuilder.createNotFoundResponse());
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
                                        Origination: variableUserId,
                                        OriginationCallerIdNumber: variableUserId,
                                        Destination: extDetails.Extension,
                                        Domain: extDetails.Extension.UserGroup.Domain,
                                        Group: extDetails.Extension,
                                        CompanyId: companyId,
                                        TenantId: tenantId
                                    };

                                    var xml = xmlBuilder.CreateRouteUserDialplan(reqId, ep, context, profile, '[^\\s]*', false);
                                    callback(undefined, xml);
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
                            if(direction === 'OUT')
                            {
                                //pick outbound rule
                            }
                            else
                            {
                                res.end(xmlBuilder.createNotFoundResponse());
                            }

                        }
                    });
                }
                else
                {
                    callback(err, xmlBuilder.createNotFoundResponse());
                }
            })

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