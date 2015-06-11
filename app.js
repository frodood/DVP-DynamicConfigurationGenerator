var restify = require('restify');
var stringify = require('stringify');
var config = require('config');
var nodeUuid = require('node-uuid');
var fsMediaFormatter = require('./FreeSwitchMediaFormatter.js');
var backendHandler = require('./SipExtBackendOperations.js');
var xmlGen = require('./XmlResponseGenerator.js');
var jsonFormatter = require('DVP-Common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var ruleHandler = require('DVP-RuleService/CallRuleBackendOperations.js');
var redisHandler = require('./RedisHandler.js');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;
var extDialplanEngine = require('./ExtendedDialplanEngine.js');
var testEml = require('./XmlExtendedDialplanBuilder.js');


var hostIp = config.Host.Ip;
var hostPort = config.Host.Port;
var hostVersion = config.Host.Version;

var server = restify.createServer({
    name: 'DVP-DynamicConfigurationGenerator',
    formatters : {
        'application/x-www-form-urlencoded' : function(req, res, body)
        {
            return body;
        }
    }
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.post('/RedisPublisher', function(req, res, next)
{
    var message = JSON.stringify(req.body);
    redisHandler.PublishToRedis('DVPEVENTS', message, function(err, result)
    {
        res.end();
    })
});



server.post('/DVP/API/' + hostVersion + '/DynamicConfigGenerator/CallApp', function(req,res,next)
{

    var reqId = nodeUuid.v1();

    //extDialplanEngine.ProcessExtendedDialplan(reqId, '99999', '1000', 'TestContext', 'OUT', 'xxx', 1, 3, '3434', function(err, ss)
   //{

    //})

    try
    {
        logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - HTTP FS DIALPLAN Request Received [CallApp]', reqId);

        logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Request Body : %s', reqId, req.body);

        var data = fsMediaFormatter.convertUrlEncoded(req.body);

        var hostname = data["hostname"];
        var cdnum = data["Caller-Destination-Number"];
        var callerContext = data["Caller-Context"];
        var huntDestNum = data["Hunt-Destination-Number"];
        var huntContext = data["Hunt-Context"];
        var varDomain = data["variable_domain"];
        var varUserId = data["variable_user_id"];
        var profile = data["variable_sofia_profile_name"];
        var varUuid = data["variable_uuid"];//check whether to get uuid or var uuid
        var varSipFromUri = data["variable_sip_from_uri"];
        var varSipToUri = data["variable_sip_to_uri"];
        var varUsrContext = data["variable_user_context"];
        var varFromNumber = data["variable_FromNumber"];

        if (cdnum && callerContext && hostname)
        {
            //Dialplan

            var destNum = (huntDestNum) ? huntDestNum:cdnum;

            //Get Context
            logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Trying to get context : %s', reqId, callerContext);

            backendHandler.GetContext(callerContext, function(err, ctxt)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - get context fail', reqId, err);
                    var xml = xmlGen.createNotFoundResponse();

                    res.end(xml);
                }
                else //Same dialplan for all - only use context to find direction
                {
                    var direction = 'IN';
                    if(ctxt && ctxt.ContextCat.toUpperCase() === "INTERNAL")
                    {
                        direction = 'OUT';
                    }

                    logger.info('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - context found category PUBLIC', reqId);
                    var decodedSipFromUri = decodeURIComponent(varSipFromUri);
                    var decodedSipToUri = decodeURIComponent(varSipToUri);

                    var fromSplitArr = decodedSipFromUri.split("@");

                    var toSplitArr = decodedSipToUri.split("@");

                    var aniNum = "";
                    var dnisNum = "";
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

                    var dnisRegExPattern = new RegExp('^(CF/)[^\s]*');
                    if(dnisRegExPattern.test(dnisNum))
                    {
                        //Call Forwarding
                        var dnisSplitArr = dnisNum.split('/');
                        var fwdId = dnisSplitArr[1];
                        var companyId = dnisSplitArr[2];
                        var tenantId = dnisSplitArr[3];
                        var disconReason = dnisSplitArr[4];
                        var dodNumber = dnisSplitArr[5];
                        var dodActive = dnisSplitArr[6];

                        extDialplanEngine.ProcessCallForwarding(reqId, aniNum, dnisNum, domain, callerContext, direction, data, companyId, tenantId, disconReason, fwdId, '', function(err, xml)
                        {
                            if(err)
                            {
                                logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - GetPhoneNumberDetails returned exception', reqId, err);
                                var xml = xmlGen.createNotFoundResponse();

                                res.end(xml);
                            }
                            else
                            {
                                res.end(xml);
                            }
                        })
                    }
                    else
                    {
                        if(direction === 'IN')
                        {
                            logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Calling GetPhoneNumberDetails with dnisNum : %s', reqId, dnisNum);

                            backendHandler.GetPhoneNumberDetails(dnisNum, function(err, num)
                            {
                                if(err)
                                {
                                    logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - GetPhoneNumberDetails returned exception', reqId, err);
                                    var xml = xmlGen.createNotFoundResponse();

                                    res.end(xml);

                                }
                                else if(num)
                                {
                                    var faxType = undefined;
                                    if(num.Trunk)
                                    {
                                        faxType = num.Trunk.FaxType;

                                        data['TrunkFaxType'] = faxType;
                                    }

                                    logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - GetPhoneNumberDetails returned num obj : %j', reqId, JSON.stringify(num));

                                    logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Trying to pick inbound rule - Params - aniNum : %s, dnisNum : %s, domain : %s, companyId : %s, tenantId : %s', reqId, aniNum, dnisNum, domain, num.CompanyId, num.TenantId);
                                    ruleHandler.PickCallRuleInbound(aniNum, dnisNum, domain, callerContext, num.CompanyId, num.TenantId, function(err, rule)
                                    {
                                        if(err)
                                        {
                                            logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - PickCallRuleInbound returned exception', reqId, err);
                                            var xml = xmlGen.createNotFoundResponse();

                                            res.end(xml);
                                        }
                                        else if(rule)
                                        {
                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - PickCallRuleInbound returned rule : %s', reqId, JSON.stringify(rule));

                                            //check dnis is a emergency number

                                            if(rule.Application)
                                            {
                                                if(rule.Application.ObjClass === 'DEVELOPMENT')
                                                {
                                                    logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has a developer app', reqId);
                                                    var masterUrl = '';
                                                    if(rule.Application.MasterApplication && rule.Application.MasterApplication.Url)
                                                    {
                                                        var masterApp = rule.Application.MasterApplication;

                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master application found : ', reqId, JSON.stringify(masterApp));

                                                        if(masterApp.ObjType === "HTTAPI")
                                                        {
                                                            logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type is HTTAPI', reqId);
                                                            //add to redis
                                                            masterUrl = rule.Application.MasterApplication.Url;
                                                            var sessionData =
                                                            {
                                                                path: rule.Application.Url,
                                                                company: rule.CompanyId,
                                                                tenant: rule.TenantId,
                                                                app: rule.Application.AppName
                                                            };

                                                            var jsonString = JSON.stringify(sessionData);

                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for HTTAPI : %s', reqId, jsonString);

                                                            redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                            {
                                                                if(err)
                                                                {
                                                                    logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                    var xml = xmlGen.createNotFoundResponse();

                                                                    res.end(xml);
                                                                }
                                                                else
                                                                {
                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                    var xml = xmlGen.CreateHttpApiDialplan('[^\\s]*', callerContext, masterUrl, reqId);

                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - HTTAPI dialplan created - Response Sent : : %s', reqId, xml);
                                                                    res.end(xml);
                                                                }

                                                            });

                                                        }
                                                        else if(masterApp.ObjType === "SOCKET")
                                                        {
                                                            logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type is SOCKET', reqId);

                                                            var sessionData =
                                                            {
                                                                path: rule.Application.Url,
                                                                company: rule.CompanyId,
                                                                tenant: rule.TenantId,
                                                                app: rule.Application.AppName
                                                            };

                                                            var jsonString = JSON.stringify(sessionData);

                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for SOCKET : %s', reqId, jsonString);

                                                            redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                            {
                                                                if(err)
                                                                {
                                                                    logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                    var xml = xmlGen.createNotFoundResponse();

                                                                    res.end(xml);
                                                                }
                                                                else
                                                                {
                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                    var xml = xmlGen.CreateSocketApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - SOCKET dialplan created - Response Sent : : %s', reqId, xml);

                                                                    res.end(xml);
                                                                }

                                                            });
                                                        }
                                                        else
                                                        {
                                                            logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type Undefined - Terminating', reqId);
                                                            var xml = xmlGen.createNotFoundResponse();

                                                            res.end(xml);
                                                        }

                                                    }
                                                    else
                                                    {
                                                        logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule developer app doesnt have a master app or master app url not set', reqId);
                                                        var xml = xmlGen.createNotFoundResponse();

                                                        res.end(xml);
                                                    }
                                                }
                                                else if(rule.Application.ObjClass === 'EXTENDED')
                                                {
                                                    extDialplanEngine.ProcessExtendedDialplan(decodedSipFromUri, decodedSipToUri, callerContext, direction, data, rule.CompanyId, rule.TenantId, 'test', function(err, extDialplan)
                                                    {
                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Extended dialplan created - Response Sent : : %s', reqId, extDialplan);
                                                        res.end(extDialplan);
                                                    })
                                                }
                                                else
                                                {
                                                    logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has a system or a master app assigned', reqId);
                                                    if(rule.Application.ObjType === 'HTTAPI')
                                                    {
                                                        logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application type is HTTAPI', reqId);

                                                        var sessionData =
                                                        {
                                                            path: rule.Application.Url,
                                                            company: rule.CompanyId,
                                                            tenant: rule.TenantId,
                                                            app: rule.Application.AppName
                                                        };

                                                        var jsonString = JSON.stringify(sessionData);

                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for HTTAPI : %s', reqId, jsonString);

                                                        redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                        {
                                                            if(err)
                                                            {
                                                                logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                var xml = xmlGen.createNotFoundResponse();

                                                                res.end(xml);
                                                            }
                                                            else
                                                            {
                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                var xml = xmlGen.CreateHttpApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - HTTAPI dialplan created - Response Sent : : %s', reqId, xml);
                                                                res.end(xml);
                                                            }

                                                        });
                                                    }
                                                    else if(rule.Application.ObjType === 'SOCKET')
                                                    {
                                                        logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application Type is SOCKET', reqId);
                                                        var sessionData =
                                                        {
                                                            path: rule.Application.Url,
                                                            company: rule.CompanyId,
                                                            tenant: rule.TenantId,
                                                            app: rule.Application.AppName
                                                        };

                                                        var jsonString = JSON.stringify(sessionData);

                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for SOCKET : %s', reqId, jsonString);

                                                        redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                        {
                                                            if(err)
                                                            {
                                                                logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                var xml = xmlGen.createNotFoundResponse();

                                                                res.end(xml);
                                                            }
                                                            else
                                                            {
                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);
                                                                var xml = xmlGen.CreateSocketApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - SOCKET dialplan created - Response Sent : : %s', reqId, xml);
                                                                res.end(xml);
                                                            }

                                                        });
                                                    }
                                                    else
                                                    {
                                                        logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application Type Undefined - Terminating', reqId);
                                                        var xml = xmlGen.createNotFoundResponse();

                                                        res.end(xml);
                                                    }
                                                }


                                                var evtData =
                                                {
                                                    SessionId: varUuid,
                                                    EventClass: "CALL",
                                                    EventType : "CALL_RULE",
                                                    EventCategory: "INBOUND_RULE",
                                                    EventTime : new Date(),
                                                    EventName : "Call Rule Picked",
                                                    EventData : dnisNum,
                                                    EventParams : rule
                                                };

                                                var jsonStr = JSON.stringify(evtData);
                                                redisHandler.PublishToRedis('DVPEVENTS', jsonStr, function(err, redisRes)
                                                {

                                                });

                                            }
                                            else
                                            {
                                                logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has no application, terminating', reqId);
                                                var xml = xmlGen.createNotFoundResponse();

                                                res.end(xml);
                                            }


                                        }
                                        else
                                        {
                                            logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule not found', reqId);
                                            var xml = xmlGen.createNotFoundResponse();

                                            res.end(xml);
                                        }
                                    })
                                }
                                else
                                {
                                    logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - GetPhoneNumberDetails returned num obj : EMPTY', reqId);
                                    var xml = xmlGen.createNotFoundResponse();

                                    res.end(xml);
                                }
                            });
                        }
                        else
                        {
                            //Get from user
                            backendHandler.GetAllDataForExt(reqId, aniNum, ctxt.TenantId, 'USER', function(err, fromExt)
                            {
                                var dodActive = false;
                                var dodNumber = '';
                                var fromUserUuid = '';
                                if(fromExt)
                                {
                                    if(fromExt.DodActive)
                                    {
                                        dodActive = true;
                                        dodNumber = fromExt.DodNumber;
                                    }

                                    if(fromExt.SipUACEndpoint && fromExt.SipUACEndpoint.UserUuid)
                                    {
                                        fromUserUuid = fromExt.SipUACEndpoint.UserUuid;
                                    }
                                }

                                logger.debug('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Trying to pick inbound rule - Params - aniNum : %s, dnisNum : %s, domain : %s, companyId : %s, tenantId : %s', reqId, aniNum, dnisNum, domain, num.CompanyId, num.TenantId);
                                ruleHandler.PickCallRuleInbound(aniNum, dnisNum, domain, callerContext, ctxt.CompanyId, ctxt.TenantId, function(err, rule)
                                {
                                    if(err)
                                    {
                                        logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - PickCallRuleInbound returned exception', reqId, err);
                                        var xml = xmlGen.createNotFoundResponse();

                                        res.end(xml);
                                    }
                                    else if(rule)
                                    {
                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - PickCallRuleInbound returned rule : %s', reqId, JSON.stringify(rule));

                                        backendHandler.GetEmergencyNumber(dnisNum, rule.TenantId, function(err, emNum)
                                        {
                                            if(emNum)
                                            {
                                                //pick outbound rule and route to gateway
                                                ruleBackendHandler.PickCallRuleOutboundComplete(aniNum, dnisNum, '', callerContext, rule.CompanyId, rule.TenantId, true, function (err, rule)
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

                                                        if(dodActive && dodNumber)
                                                        {
                                                            ep.Origination = dodNum;
                                                            ep.OriginationCallerIdNumber = dodNum;
                                                        }
                                                        else
                                                        {
                                                            ep.Origination = rule.ANI;
                                                            ep.OriginationCallerIdNumber = rule.ANI;
                                                        }

                                                        var xml = xmlBuilder.CreateRouteGatewayDialplan(reqId, ep, callerContext, profile, '[^\\s]*', false);

                                                        callback(undefined, xml);
                                                    }
                                                })
                                            }
                                            else
                                            {
                                                //do normal op
                                                if(rule.Application)
                                                {
                                                    if(rule.Application.ObjClass === 'DEVELOPMENT')
                                                    {
                                                        logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has a developer app', reqId);
                                                        var masterUrl = '';
                                                        if(rule.Application.MasterApplication && rule.Application.MasterApplication.Url)
                                                        {
                                                            var masterApp = rule.Application.MasterApplication;

                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master application found : %j', reqId, JSON.stringify(masterApp));

                                                            if(masterApp.ObjType === "HTTAPI")
                                                            {
                                                                logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type is HTTAPI', reqId);
                                                                //add to redis
                                                                masterUrl = rule.Application.MasterApplication.Url;
                                                                var sessionData =
                                                                {
                                                                    path: rule.Application.Url,
                                                                    company: rule.CompanyId,
                                                                    tenant: rule.TenantId,
                                                                    app: rule.Application.AppName
                                                                };

                                                                var jsonString = JSON.stringify(sessionData);

                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for HTTAPI : %s', reqId, jsonString);

                                                                redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                                {
                                                                    if(err)
                                                                    {
                                                                        logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                        var xml = xmlGen.createNotFoundResponse();

                                                                        res.end(xml);
                                                                    }
                                                                    else
                                                                    {
                                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                        var xml = xmlGen.CreateHttpApiDialplan('[^\\s]*', callerContext, masterUrl, reqId);

                                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - HTTAPI dialplan created - Response Sent : : %s', reqId, xml);
                                                                        res.end(xml);
                                                                    }

                                                                });

                                                            }
                                                            else if(masterApp.ObjType === "SOCKET")
                                                            {
                                                                logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type is SOCKET', reqId);

                                                                var sessionData =
                                                                {
                                                                    path: rule.Application.Url,
                                                                    company: rule.CompanyId,
                                                                    tenant: rule.TenantId,
                                                                    app: rule.Application.AppName
                                                                };

                                                                var jsonString = JSON.stringify(sessionData);

                                                                logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for SOCKET : %s', reqId, jsonString);

                                                                redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                                {
                                                                    if(err)
                                                                    {
                                                                        logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                        var xml = xmlGen.createNotFoundResponse();

                                                                        res.end(xml);
                                                                    }
                                                                    else
                                                                    {
                                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                        var xml = xmlGen.CreateSocketApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                        logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - SOCKET dialplan created - Response Sent : : %s', reqId, xml);

                                                                        res.end(xml);
                                                                    }

                                                                });
                                                            }
                                                            else
                                                            {
                                                                logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Master App Type Undefined - Terminating', reqId);
                                                                var xml = xmlGen.createNotFoundResponse();

                                                                res.end(xml);
                                                            }

                                                        }
                                                        else
                                                        {
                                                            logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule developer app doesnt have a master app or master app url not set', reqId);
                                                            var xml = xmlGen.createNotFoundResponse();

                                                            res.end(xml);
                                                        }
                                                    }
                                                    else if(rule.Application.ObjClass === 'EXTENDED')
                                                    {
                                                        data.FromUserUuid = fromUserUuid;
                                                        extDialplanEngine.ProcessExtendedDialplan(decodedSipFromUri, decodedSipToUri, callerContext, direction, data, rule.CompanyId, rule.TenantId, 'test', function(err, extDialplan)
                                                        {
                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Extended dialplan created - Response Sent : : %s', reqId, extDialplan);
                                                            res.end(extDialplan);
                                                        })
                                                    }
                                                    else
                                                    {
                                                        logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has a system or a master app assigned', reqId);
                                                        if(rule.Application.ObjType === 'HTTAPI')
                                                        {
                                                            logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application type is HTTAPI', reqId);

                                                            var sessionData =
                                                            {
                                                                path: rule.Application.Url,
                                                                company: rule.CompanyId,
                                                                tenant: rule.TenantId,
                                                                app: rule.Application.AppName
                                                            };

                                                            var jsonString = JSON.stringify(sessionData);

                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for HTTAPI : %s', reqId, jsonString);

                                                            redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                            {
                                                                if(err)
                                                                {
                                                                    logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                    var xml = xmlGen.createNotFoundResponse();

                                                                    res.end(xml);
                                                                }
                                                                else
                                                                {
                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);

                                                                    var xml = xmlGen.CreateHttpApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - HTTAPI dialplan created - Response Sent : : %s', reqId, xml);
                                                                    res.end(xml);
                                                                }

                                                            });
                                                        }
                                                        else if(rule.Application.ObjType === 'SOCKET')
                                                        {
                                                            logger.info('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application Type is SOCKET', reqId);
                                                            var sessionData =
                                                            {
                                                                path: rule.Application.Url,
                                                                company: rule.CompanyId,
                                                                tenant: rule.TenantId,
                                                                app: rule.Application.AppName
                                                            };

                                                            var jsonString = JSON.stringify(sessionData);

                                                            logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session Data Object created for SOCKET : %s', reqId, jsonString);

                                                            redisHandler.SetObject(varUuid + "_data", jsonString, function(err, result)
                                                            {
                                                                if(err)
                                                                {
                                                                    logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception in setting sessionData on backend - Key : : %s_data', reqId, varUuid, err);
                                                                    var xml = xmlGen.createNotFoundResponse();

                                                                    res.end(xml);
                                                                }
                                                                else
                                                                {
                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Session data added to redis successfully - Key : : %s_data', reqId, varUuid);
                                                                    var xml = xmlGen.CreateSocketApiDialplan('[^\\s]*', callerContext, rule.Application.Url, reqId);

                                                                    logger.debug('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - SOCKET dialplan created - Response Sent : : %s', reqId, xml);
                                                                    res.end(xml);
                                                                }

                                                            });
                                                        }
                                                        else
                                                        {
                                                            logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Application Type Undefined - Terminating', reqId);
                                                            var xml = xmlGen.createNotFoundResponse();

                                                            res.end(xml);
                                                        }
                                                    }


                                                    var evtData =
                                                    {
                                                        SessionId: varUuid,
                                                        EventClass: "CALL",
                                                        EventType : "CALL_RULE",
                                                        EventCategory: "INBOUND_RULE",
                                                        EventTime : new Date(),
                                                        EventName : "Call Rule Picked",
                                                        EventData : dnisNum,
                                                        EventParams : rule
                                                    };

                                                    var jsonStr = JSON.stringify(evtData);
                                                    redisClient.publish('DVPEVENTS', jsonStr);

                                                }
                                                else
                                                {
                                                    logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule has no application, terminating', reqId);
                                                    var xml = xmlGen.createNotFoundResponse();

                                                    res.end(xml);
                                                }

                                            }
                                        })


                                    }
                                    else
                                    {
                                        logger.error('DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Call rule not found', reqId);
                                        var xml = xmlGen.createNotFoundResponse();

                                        res.end(xml);
                                    }
                                })
                            })


                        }


                    }
                }

            })



        }
        else
        {
            logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - cdnum OR callerContext OR hostname not found in request - Terminating', reqId);
            var xml = xmlGen.createNotFoundResponse();

            res.end(xml);
        }
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CallApp] - [%s] - Exception occurred on CallApp Api Method - Error : ', reqId, ex);
        var xml = xmlGen.createNotFoundResponse();

        res.end(xml);
    }

    return next();

});


server.get('/DVP/API/' + hostVersion + '/DynamicConfigGenerator/LbRequestController/:direction/:number/:ip', function(req,res,next)
{
    var reqId = nodeUuid.v1();

    try
    {
        logger.info('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - HTTP SIPLB Request Received [LbRequestController]', reqId);

        var direction = req.params.direction;
        var number = req.params.number;

        logger.debug('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - Request Params - direction : %s, number : %s', reqId, direction, number);

        if(direction === "in")
        {
            logger.info('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - call direction is IN', reqId);
            backendHandler.GetCloudForIncomingRequest(number, 0, function(err, cb)
            {
                if(err || !cb)
                {
                    if(err)
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - Exception occurred while executing GetCloudForIncomingRequest', reqId, err);
                    }
                    else
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - GetCloudForIncomingRequest returned empty object', reqId);
                    }
                    res.end(",,");
                }
                else
                {
                    var returnMessage = cb.LimitId + "," + cb.LoadBalanceType + "," + cb.IpCode;

                    logger.debug('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - GetCloudForIncomingRequest object found - Returning LB Details : %s', reqId, returnMessage);

                    res.end(returnMessage);
                }

            });
        }
        else if(direction === "out")
        {
            logger.info('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - call direction is OUT', reqId);
            backendHandler.GetGatewayForOutgoingRequest(number, 0, function(err, cb)
            {
                if(err || !cb)
                {
                    if(err)
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - Exception occurred while executing GetGatewayForOutgoingRequest', reqId, err);
                    }
                    else
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - GetGatewayForOutgoingRequest returned empty object', reqId);
                    }

                    res.end(",");
                }
                else
                {
                    var returnMessage = cb.LimitId + "," + cb.GwIpUrl;

                    logger.debug('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - GetGatewayForOutgoingRequest object found - Returning Gateway Details : %s', reqId, returnMessage);

                    res.end(returnMessage);
                }

            });
        }
        else
        {
            logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - call direction is NOT DEFINED - Terminating', reqId);

            res.end(",");
        }

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.LbRequestController] - [%s] - Exception occurred on LbRequestController Api Method - Error : ', reqId, ex);
        res.end(",");
    }

    return next();
});


server.post('/DVP/API/' + hostVersion + '/DynamicConfigGenerator/DirectoryProfile', function(req, res, next)
{
    var reqId = nodeUuid.v1();

    try
    {
        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - HTTP FS DIRECTORY_PROFILE Request Received [DirectoryProfile]', reqId);

        logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Request Body : %s', reqId, req.body);

        var data = fsMediaFormatter.convertUrlEncoded(req.body);

        var hostname = data["hostname"];
        var user = data["user"];
        var domain = data["domain"];
        var action = data["action"];
        var purpose = data["purpose"];
        var group = data["group"];
        var sipAuthRealm = data["sip_auth_realm"];
        var profile = data["profile"];

        if(action && group && hostname && domain && action === "group_call")
        {
            logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - ACTION TYPE GROUP_CALL', reqId);

            var tempAuthRealm = domain;
            if(sipAuthRealm != undefined)
            {
                tempAuthRealm = sipAuthRealm;
            }

            logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Sip Auth Realm Set to : %s', reqId, tempAuthRealm);

            backendHandler.GetGroupBy_Name_Domain(group, tempAuthRealm, function(err, result)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetGroupBy_Name_Domain threw an exception', reqId, err);
                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
                else if(result)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetGroupBy_Name_Domain returned group details : %j', reqId, result);
                    var xml = xmlGen.CreateUserGroupDirectoryProfile(result, reqId);

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);

                }
                else
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetGroupBy_Name_Domain returned empty object', reqId);
                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
            })

        }
        else if(action && user && hostname && domain && (action === 'sip_auth' || action === 'message-count'))
        {
            logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - ACTION TYPE SIP_AUTH', reqId);
            var tempAuthRealm = domain;
            if(sipAuthRealm != undefined)
            {
                tempAuthRealm = sipAuthRealm;
            }

            logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Sip Auth Realm Set to : %s', tempAuthRealm);

            backendHandler.GetUserBy_Name_Domain(user, tempAuthRealm, function(err, usr)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetUserBy_Name_Domain threw an exception', reqId, err);
                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
                else if(usr)
                {
                    //create xml
                    logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetUserBy_Name_Domain returned user : %j', reqId, usr);
                    if(usr.CloudEndUser)
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - User Has a Cloud End User', reqId);

                        var xml = xmlGen.createDirectoryProfile(usr.SipUsername, usr.SipExtension, usr.CloudEndUser.Domain, usr.EmailAddress, usr.Password, usr.ContextId, reqId);

                        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                        res.end(xml);
                    }
                    else
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - User Has NO Cloud End User', reqId);
                        var xml = xmlGen.createNotFoundResponse();
                        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);
                        res.end(xml);
                    }
                }
                else
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetUserBy_Name_Domain returned empty object', reqId);
                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
            })
        }
        else if(action && user && hostname && domain && (action === 'user_call' || action === 'voicemail-lookup'))
        {
            if(action === 'user_call')
            {
                logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - ACTION TYPE USER_CALL', reqId);
            }
            else
            {
                logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - ACTION TYPE VOICEMAIL_LOOKUP', reqId);
            }

            var tempAuthRealm = domain;
            if(sipAuthRealm != undefined)
            {
                tempAuthRealm = sipAuthRealm;
            }

            logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Sip Auth Realm Set to : %s', tempAuthRealm);

            backendHandler.GetUserBy_Ext_Domain(user, tempAuthRealm, function(err, usr){

                if(!err && usr)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetUserBy_Ext_Domain returned user : %j', reqId, usr);
                    //create xml
                    if(usr.CloudEndUser)
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - User Has a Cloud End User', reqId);
                        var xml = xmlGen.createDirectoryProfile(usr.SipUsername, usr.SipExtension, usr.CloudEndUser.Domain, usr.EmailAddress, usr.Password, usr.ContextId, reqId);

                        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                        res.end(xml);
                    }
                    else
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - User Has NO Cloud End User', reqId);

                        var xml = xmlGen.createNotFoundResponse();

                        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                        res.end(xml);
                    }
                }
                else
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - User not found', reqId, err);

                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
            })
        }
        else if(purpose && profile && hostname && purpose === 'gateways')
        {
            logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - ACTION TYPE GATEWAYS', reqId);
            var csId = parseInt(hostname);
            backendHandler.GetGatewayListForCallServerProfile(profile, csId, reqId, function(err, result)
            {
                if (!err && result && result.length > 0)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - backendHandler.GetGatewayListForCallServerProfile returned gw result - list count : %d', reqId, result.length);

                    var xml = xmlGen.CreateGatewayProfile(result, reqId);

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }
                else
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Gateways not found', reqId, err);
                    var xml = xmlGen.createNotFoundResponse();

                    logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);

                    res.end(xml);
                }

            })
        }
        else
        {
            var xml = xmlGen.createNotFoundResponse();
            logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);
            res.end(xml);
        }

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - Exception occurred on DirectoryProfile Api Method - Error : ', reqId, ex);
        var xml = xmlGen.createNotFoundResponse();
        logger.info('[DVP-DynamicConfigurationGenerator.DirectoryProfile] - [%s] - API RESPONSE - %s', reqId, xml);
    }

    return next();

});


server.listen(hostPort, hostIp, function () {
    console.log('%s listening at %s', server.name, server.url);
});