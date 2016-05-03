var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var dbModel = require('dvp-dbmodels');
var underscore = require('underscore');
var redisHandler = require('./RedisHandler.js');
var ipValidator = require('./IpValidator.js');

var data =
{
    SipUACEndpoint:
    {
        "User1": {"id": 1, "SipUsername":"User1", "Password": "123", "ExtensionId":1},
        "User2": {"id": 2, "SipUsername":"User2", "Password": "123", "ExtensionId":null}
    },
    Extension:
    {
        "1000": {"id": 1, "Extension":"1000"},
        "1001": {"id": 2, "Extension":"1001"}
    },
    TransferCode:
    {"id":1},
    CloudEndUser:
    {
        1: {"id": 1, "Domain":"192.168.1.23"},
        2: {"id": 1, "Domain":"192.168.1.23"}
    },
    UserGroup:
        [
            {
                "GroupName": "TestGrp",
                "ExtensionId": "1001",
                "SipUACEndpoint":
                {
                    "User1": {"id": 1, "SipUsername": "User1", "Password": "123", "ExtensionId": 1},
                    "User2": {"id": 2, "SipUsername": "User2", "Password": "123", "ExtensionId": null}
                }
            }
        ],
    NumberBlacklist:
    {
        "0112300566": {"PhoneNumber": "0112300566"}
    }
};


var GetUserBy_Ext_Domain = function(extension, domain, data, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: {SipExtension: extension}, include: [{model: dbModel.CloudEndUser, as: "CloudEndUser", where: {Domain: domain}}]})
            .then(function (ext)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetUserBy_Ext_Domain] PGSQL Get sip endpoint for ext domain query success');

                callback(undefined, ext);

            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetUserBy_Ext_Domain] PGSQL Get sip endpoint for ext domain query failed', err);

                callback(err, undefined);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetUserBy_Name_Domain = function(extName, domain, data, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: {SipUsername: extName}, include: [{model: dbModel.CloudEndUser, as: "CloudEndUser", where: {Domain : domain}}]})
            .then(function (ext)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetUserBy_Name_Domain] PGSQL Get sip endpoint for username domain query success');

                callback(undefined, ext);

            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetUserBy_Name_Domain] PGSQL Get sip endpoint for username domain query failed', err);
                callback(err, undefined);
            })

    }
    catch(ex)
    {
        callback(ex, undefined);
    }


};

var GetUserDetailsByUsername = function(reqId, username, data, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: [{SipUsername: username}]})
            .then(function (usr)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetUserDetailsByUsername] PGSQL Get sip endpoint for username query success');

                callback(undefined, usr);

            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetUserDetailsByUsername] PGSQL Get sip endpoint for username query failed', err);
                callback(err, undefined);
            })

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetPublicClusterDetailsDB = function(reqId, data, cb)
{
    try
    {
        dbModel.Cloud.find({where :[{Type: 'PUBLIC'}], include: [{model: dbModel.LoadBalancer, as: "LoadBalancer"}]})
            .then(function(resCloud)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetPublicClusterDetailsDB] - [%s] - Public CloudEndUser details found',reqId);

                cb(undefined, resCloud);

            }).catch(function(errCloud)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetPublicClusterDetailsDB] - [%s] - Public CloudEndUser details searching error',reqId, errCloud);
                cb(errCloud, undefined);
            });
    }
    catch(ex)
    {
        cb(ex, undefined);
    }
}

//Done
var GatherFromUserDetails = function(reqId, usrName, companyId, tenantId, ignoreTenant, data, callback)
{
    GetUserByNameTenantDB(reqId, usrName, companyId, tenantId, ignoreTenant, data, function(err, res)
    {
        if(res)
        {
            GetTransferCodesForTenantDB(reqId, res.TenantId, data, function(err, resTrans)
            {
                if(resTrans)
                {
                    res.TransferCode = resTrans;
                }

                callback(err, res);

            })
        }
        else
        {
            callback(err, res);
        }
    })
};

//Done
//OK
var GetUserByNameTenantDB = function(reqId, extName, companyId, tenantId, ignoreTenant, data, callback)
{
    try
    {
        if(!ignoreTenant)
        {

            var usrKey = 'SIPUSER:' + tenantId + ':' + companyId + ':' + extName;

            redisHandler.GetObjectParseJson(null, usrKey, function(err1, usr)
            {
                if(usr && usr.ExtensionId)
                {

                    var extByIdKey = 'EXTENSIONBYID:' + tenantId + ':' + companyId + ':' + usr.ExtensionId;

                    redisHandler.GetObjectParseJson(null, extByIdKey, function(err2, ext)
                    {
                        if(ext)
                        {
                            usr.Extension = ext;

                            callback(null, usr);
                        }
                        else
                        {
                            callback(err2, null);
                        }

                    });

                }
                else
                {
                    callback(err1, null);
                }

            });

        }
        else
        {
            dbModel.SipUACEndpoint
                .find({where: [{SipUsername: extName}], include:[{model: dbModel.Extension, as: 'Extension'}]})
                .then(function (usr)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetUserByNameTenantDB] PGSQL Get sip endpoint for username tenant query success');

                    callback(undefined, usr);

                }).catch(function(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetUserByNameTenantDB] PGSQL Get sip endpoint for username tenant query failed', err);
                    callback(err, undefined);
                })
        }


    }
    catch(ex)
    {
        callback(ex, undefined);
    }


};

//Done
//OK
var GetTransferCodesForTenantDB = function(reqId, tenantId, data, callback)
{
    try
    {
        if(data)
        {
            callback(undefined, data.TransferCode);
        }
        else
        {
            callback(new Error('Error getting TransferCode'), undefined);
        }

    }
    catch(ex)
    {
        callback(ex, undefined);
    }


};

//Done
//OK
var GetExtensionForDid = function(reqId, didNumber, companyId, tenantId, data, callback)
{
    try
    {
        if(data && data.DidNumber)
        {
            var did = data.DidNumber[didNumber];

            if(did && did.ExtensionId)
            {

                var extByIdKey = 'EXTENSIONBYID:' + tenantId + ':' + companyId + ':' + did.ExtensionId;

                redisHandler.GetObjectParseJson(null, extByIdKey, function(err, ext)
                {
                    if(ext)
                    {
                        did.Extension = ext;
                        callback(null, did);
                    }
                    else
                    {
                        callback(err, null);
                    }

                });

            }
            else
            {
                callback(new Error('DID not found or extension not set'), null);
            }
        }
        else
        {
            callback(new Error('Error getting data from cache'), null);
        }



    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - Exception occurred', reqId, ex);
        callback(ex, null);
    }

};

//Done
//OK if a separate extension keys are managed by extension number for tenant
var GetExtensionDB = function(reqId, ext, companyId, tenantId, data, callback)
{
    try
    {
        var extKey = 'EXTENSION:' + tenantId + ':' + companyId + ':' + ext;

        redisHandler.GetObjectParseJson(null, extKey, function(err, ext)
        {
            callback(err, ext);
        });
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }

};

//Incomplete
var GetPresenceDB = function(reqId, username, data, callback)
{
    try
    {
        callback(undefined, undefined);
        //dbModel.SipPresence.find({where: [{SipUsername: username}]})
        //    .then(function (presInfo)
        //    {
        //        logger.debug('[DVP-DynamicConfigurationGenerator.GetPresenceDB] - [%s] - PGSQL get presence details query success', reqId);
        //        callback(undefined, presInfo);
        //    })
        //    .catch(function(err)
        //    {
        //        logger.error('[DVP-DynamicConfigurationGenerator.GetPresenceDB] - [%s] - PGSQL get presence details query failed', reqId, err);
        //        callback(err, undefined);
        //    });
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetPresenceDB] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }

};

var ManageGroupIds = function(reqId, grpIdArr, companyId, tenantId, callback)
{
    var grpArr = [];
    var count = 0;

    try
    {
        for(i=0; i<grpIdArr.length; i++)
        {
            var grpKey = 'USERGROUP:' + tenantId + ':' + companyId + ':' + grpIdArr[i];

            redisHandler.GetObjectParseJson(null, grpKey, function(err, grp)
            {
                if(grp.ExtensionId)
                {
                    var extByIdKey = 'EXTENSIONBYID:' + tenantId + ':' + companyId + ':' + grp.ExtensionId;

                    redisHandler.GetObjectParseJson(null, extByIdKey, function(err, extById)
                    {
                        if(extById)
                        {
                            grp.Extension = extById;
                            grpArr.push(grp);

                        }

                        if(count < grpIdArr.length)
                        {
                            callback(null, grpArr);
                        }

                        count++;

                    });

                }
                else
                {
                    if(count < grpIdArr.length)
                    {
                        callback(null, grpArr);
                    }

                    count++;
                }

            });
        }
    }
    catch(ex)
    {
        if(count < grpIdArr.length)
        {
            callback(null, grpArr);
        }
    }
};

//Done - Without Conference
var GetAllDataForExt = function(reqId, extension, companyId, tenantId, extType, callServerId, data, callback)
{
    try
    {

        if(extType === 'USER')
        {
            var extKey = 'EXTENSION:' + tenantId + ':' + companyId + ':' + extension;

            redisHandler.GetObjectParseJson(null, extKey, function(err, extData)
            {
                if(extData && extData.MappingID)
                {
                    var userKey = 'SIPUSERBYID:' + tenantId + ':' + companyId + ':' + extData.MappingID;

                    redisHandler.GetObjectParseJson(null, userKey, function(err, usr)
                    {
                        if(usr)
                        {
                            extData.SipUACEndpoint = usr;

                            if (data.CloudEndUser)
                            {
                                var ceTemp = data.CloudEndUser[usr.CloudEndUserId];

                                if (ceTemp)
                                {
                                    usr.CloudEndUser = ceTemp;
                                }

                            }

                            GetTransferCodesForTenantDB(reqId, extData.SipUACEndpoint.TenantId, data, function(err, resTrans)
                            {
                                if(resTrans)
                                {
                                    extData.SipUACEndpoint.TransferCode = resTrans;
                                }

                                GetPresenceDB(reqId, extData.SipUACEndpoint.SipUsername, data, function(err, presInf)
                                {
                                    if(presInf && presInf.Status === 'Available')
                                    {
                                        extData.SipUACEndpoint.UsePublic = false;
                                        callback(err, extData);
                                    }
                                    else
                                    {
                                        if(extData.SipUACEndpoint.UsePublic)
                                        {
                                            GetCallServerClusterDetailsDB(callServerId, data, function(err, cloudInfo)
                                            {
                                                if(cloudInfo && cloudInfo.Cloud && cloudInfo.Cloud.LoadBalancer)
                                                {
                                                    extData.SipUACEndpoint.Domain = cloudInfo.Cloud.LoadBalancer.MainIP;
                                                    extData.SipUACEndpoint.UsePublic = true;
                                                }

                                                callback(err, extData);

                                            })
                                        }
                                        else
                                        {
                                            extData.SipUACEndpoint.UsePublic = false;

                                            if(usr.GroupIDs && usr.GroupIDs.length)
                                            {
                                                ManageGroupIds(reqId, usr.GroupIDs, companyId, tenantId, function(err, grpArr)
                                                {
                                                    if(grpArr && grpArr.length)
                                                    {
                                                        extData.SipUACEndpoint.UserGroup = grpArr;
                                                    }

                                                    callback(err, extData);
                                                })


                                            }
                                            else
                                            {
                                                callback(err, extData);
                                            }

                                        }
                                    }

                                })

                            })

                        }
                        else
                        {
                            callback(new Error('Extension not mapped to user'), null);
                        }


                    });
                }
                else
                {
                    callback(new Error('Extension data or mapping id not found'), null);
                }

            });


        }
        else if(extType === 'GROUP')
        {

            var extKey = 'EXTENSION:' + tenantId + ':' + companyId + ':' + extension;

            redisHandler.GetObjectParseJson(null, extKey, function(err, extData)
            {
                if (extData && extData.MappingID)
                {
                    var grpKey = 'USERGROUP:' + tenantId + ':' + companyId + ':' + extData.MappingID;

                    redisHandler.GetObjectParseJson(null, grpKey, function (err, grp)
                    {
                        if(grp)
                        {
                            extData.UserGroup = grp;

                            callback(null, extData);
                        }
                        else
                        {
                            callback(new Error('Group data not found'), null);
                        }

                    })
                }
                else
                {
                    callback(new Error('Extension data or mapping id not found'), null);
                }
            });

        }
        else if(extType === 'CONFERENCE')
        {
            dbModel.Extension.find({where: [{Extension: extension},{TenantId: tenantId},{ObjCategory: extType}], include: [{model: dbModel.Conference, as:'Conference', include : [{model: dbModel.ConferenceUser, as : 'ConferenceUser', include:[{model: dbModel.SipUACEndpoint, as: 'SipUACEndpoint', include:[{model: dbModel.CloudEndUser, as: 'CloudEndUser'}]}]},{model: dbModel.CloudEndUser, as: 'CloudEndUser'}]}]})
                .then(function (extData)
                {
                    callback(undefined, extData);
                }).catch(function(err)
                {
                    callback(err, undefined);
                });
        }
        else if(extType === 'VOICE_PORTAL')
        {

            var extKey = 'EXTENSION:' + tenantId + ':' + companyId + ':' + extension;

            redisHandler.GetObjectParseJson(null, extKey, function(err, extData)
            {
                callback(undefined, extData);
            });
        }
        else
        {
            logger.error('[DVP-DynamicConfigurationGenerator.GetAllDataForExt] - [%s] - Unsupported extension type', reqId);
            callback(new Error('Unsupported extension type'), undefined);
        }

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetAllDataForExt] - [%s] - Exception occurred', reqId, ex);
        callback(ex, false);
    }

};

//Only Used in Directory Profile - No Need To Cache
var GetGroupBy_Name_Domain = function(grpName, domain, data, callback)
{
    try
    {
        dbModel.UserGroup
            .find({where: [{Domain: domain},{GroupName: grpName}], include: [{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint", include:[{model: dbModel.CloudEndUser, as : "CloudEndUser"}]}, {model: dbModel.Extension, as: "Extension"}]})
            .then(function (grpData)
            {

                logger.debug('[DVP-DynamicConfigurationGenerator.GetGroupBy_Name_Domain] PGSQL Get user group query success');

                callback(undefined, grpData);
            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetGroupBy_Name_Domain] PGSQL Get user group query failed', err);

                callback(err, undefined);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

//Incomplete
var GetGroupByExtension = function(reqId, extension, tenant, data, callback)
{
    try
    {
        dbModel.Extension
            .find({where: [{Extension: extension},{TenantId: tenant}], include: [{model: dbModel.UserGroup, as: "UserGroup", include:[{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint"}]}]})
            .then(function (grpData)
            {

                logger.debug('[DVP-DynamicConfigurationGenerator.GetGroupByExtension] PGSQL GetGroupByExtension query success');

                callback(undefined, grpData);
            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetGroupByExtension] PGSQL GetGroupByExtension query failed', err);

                callback(err, undefined);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

//Incomplete - not used in call app
var GetCallServersForEndUserDB = function(reqId, companyId, tenantId, data, callback)
{
    var csList = [];
    try
    {
        //record found

        dbModel.CloudEndUser
            .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
            .then(function (endUser)
            {
                if(endUser && endUser.SIPConnectivityProvision)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud end user query success', reqId);
                    var provisionMechanism = endUser.SIPConnectivityProvision;

                    switch(provisionMechanism)
                    {
                        case 1:
                        {
                            //find call server
                            dbModel.CallServer
                                .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                                .then(function (cs)
                                {
                                    if(cs)
                                    {
                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get call server query success', reqId);
                                        //call server found
                                        csList.push(cs);
                                        callback(undefined, csList);

                                    }
                                    else
                                    {
                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get call server query success', reqId);
                                        callback(new Error('Cannot find a call server dedicated to company number'), csList);
                                    }

                                }).catch(function(err)
                                {
                                    logger.error('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get call server query failed', reqId, err);
                                    callback(err, csList);
                                });
                        }
                            break;
                        case 2:
                        {
                            //find call server that matches profile
                            dbModel.SipNetworkProfile
                                .find({where :[{CompanyId: companyId}, {TenantId: tenantId}, {ObjType: "INTERNAL"}], include : [{model: dbModel.CallServer, as: "CallServer"}]})
                                .then(function (res)
                                {
                                    if(res)
                                    {
                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get sip profile query success', reqId);
                                        if(res.CallServer)
                                        {

                                            csList.push(res.CallServer);

                                            callback(undefined, csList);
                                        }
                                        else
                                        {
                                            callback(new Error('call server not connected to sip profile'), csList);
                                        }
                                    }
                                    else
                                    {
                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get sip profile query success', reqId);
                                        callback(new Error('Cannot find a sip network profile'), csList);
                                    }


                                }).catch(function(err)
                                {
                                    logger.error('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get sip profile query failed', reqId, err);
                                    callback(err, csList);
                                });
                            break;
                        }
                        case 3:
                        {
                            //find cloud code that belongs to cloud end user

                            if(endUser.ClusterId)
                            {
                                var clusId = endUser.ClusterId;

                                dbModel.Cloud
                                    .find({where :[{id: clusId}], include:[{model: dbModel.CallServer, as:"CallServer"}]})
                                    .then(function (clusterInfo)
                                    {
                                        if(clusterInfo)
                                        {
                                            logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud query success', reqId);

                                            callback(undefined, clusterInfo.CallServer);
                                        }
                                        else
                                        {
                                            logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud query success', reqId);
                                            callback(new Error('Cannot find a cloud for end user'), csList);
                                        }

                                    }).catch(function(err)
                                    {
                                        logger.error('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud query failed', reqId, err);
                                        callback(err, csList);
                                    });

                            }
                            else
                            {
                                callback(new Error('Cluster Id not set'), csList);
                            }
                            break;

                        }
                        default:
                        {
                            callback(new Error('Invalid provision mechanism'), csList);
                            break;
                        }
                    }
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud end user query success', reqId);
                    callback(new Error('Cloud Enduser not found'), csList);
                }

            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetCallServersForEndUserDB] - [%s] - PGSQL Get cloud end user query failed', reqId, err);
                callback(err, csList);
            });
    }
    catch(ex)
    {
        callback(ex, csList);

    }
};

var GetCacheObject = function(tenantId, companyId, callback)
{
    try
    {
        redisHandler.GetObjectParseJson(null, 'DVPCACHE:' + tenantId + ':' + companyId, function(err, data)
        {
            callback(err, data);
        });
    }
    catch(ex)
    {
        callback(ex, null);
    }
}


//Done
var GetContext = function(context, callback)
{
    try
    {
        redisHandler.GetObjectParseJson(null, 'CONTEXT:' + context, function(err, ctxt)
        {
            callback(err, ctxt);
        });

    }
    catch(ex)
    {
        callback(ex, null);
    }
};

//Done
var GetEmergencyNumber = function(numb, companyId, tenantId, data, callback)
{
    try
    {
        var eNum = null;

        redisHandler.GetObjectParseJson(null, 'EMERGENCYNUMBER:' + tenantId + ':' + companyId, function(err, eNumList)
        {
            if(eNumList)
            {
                eNum = eNumList[numb];
            }

            callback(err, eNum);
        });

    }
    catch(ex)
    {
        callback(ex, null);
    }
};

//Done
var GetPhoneNumberDetails = function(phnNum, callback)
{
    try
    {

        redisHandler.GetObjectParseJson(null, 'TRUNKNUMBER:' + phnNum, function(err, phnInfo)
        {
            if(phnInfo)
            {

                if(!phnInfo.Enable)
                {
                    callback(undefined, undefined, null);
                }
                else
                {

                    redisHandler.GetObjectParseJson(null, 'DVPCACHE:' + phnInfo.TenantId + ':' + phnInfo.CompanyId, function(err, data)
                    {
                        if(data)
                        {

                            if(data && data.LimitInfo)
                            {
                                if(phnInfo.InboundLimitId)
                                {
                                    var inbLim = data.LimitInfo[phnInfo.InboundLimitId];

                                    if(inbLim)
                                    {
                                        phnInfo.LimitInfoInbound = inbLim;
                                    }
                                }

                                if(phnInfo.BothLimitId)
                                {
                                    var bothLim = data.LimitInfo[phnInfo.BothLimitId];

                                    if(bothLim)
                                    {
                                        phnInfo.LimitInfoBoth = bothLim;
                                    }
                                }

                            }

                            if(phnInfo.TrunkId)
                            {

                                redisHandler.GetObjectParseJson(null, 'TRUNK:' + phnInfo.TrunkId, function(err, tr)
                                {

                                    if(tr)
                                    {
                                        phnInfo.Trunk = tr;
                                    }
                                    callback(undefined, phnInfo, data);
                                });


                            }
                            else
                            {
                                callback(undefined, phnInfo, data);
                            }
                        }
                        else
                        {
                            callback(undefined, undefined, data);
                        }
                    });


                }
            }
            else
            {
                callback(undefined, undefined, null);
            }

        });

    }
    catch(ex)
    {
        callback(ex, undefined, null);
    }
};

//Directory Profile
var GetGatewayListForCallServerProfile = function(profile, csId, reqId, data, callback)
{
    try
    {
        var gatewayList = [];

        dbModel.SipNetworkProfile
            .find({where :[{ProfileName: profile},{ObjType: 'EXTERNAL'}], include: [{model: dbModel.CallServer, as: "CallServer", where:[{id: csId}]},{model: dbModel.Trunk, as: "Trunk"}]})
            .then(function (result)
            {
                try
                {
                    if(result)
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get SipNetworkProfile query success');
                        //check profile contains direct trunk map

                        //direct trunk termination
                        if(result.Trunk != null)
                        {
                            var trunkList = result.Trunk;

                            trunkList.forEach(function(trunk)
                            {
                                var gw =
                                {
                                    IpUrl : trunk.IpUrl,
                                    Domain : result.InternalIp,
                                    TrunkCode: trunk.TrunkCode,
                                    Proxy: undefined
                                };
                                gatewayList.push(gw);
                            })
                        }

                        if(result.CallServer && result.CallServer.ClusterId)
                        {
                            try
                            {
                                dbModel.Cloud.find({where: [{id: result.CallServer.ClusterId}], include: [{ model: dbModel.LoadBalancer, as: "LoadBalancer", include: [{model: dbModel.Trunk, as: "Trunk"}]}]})
                                    .then(function (rslt)
                                    {

                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get Cloud - LoadBalancer - Trunk query success');

                                        if (rslt)
                                        {
                                            if (rslt.LoadBalancer && rslt.LoadBalancer.Trunk)
                                            {
                                                var trunkList = rslt.LoadBalancer.Trunk;

                                                trunkList.forEach(function (trunk)
                                                {
                                                    var gw =
                                                    {
                                                        IpUrl: trunk.IpUrl,
                                                        Domain: result.InternalIp,
                                                        TrunkCode: trunk.TrunkCode,
                                                        Proxy: rslt.LoadBalancer.MainIP
                                                    };
                                                    gatewayList.push(gw);
                                                });

                                                callback(undefined, gatewayList);
                                            }
                                            else
                                            {
                                                logger.warn('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] - [%s] - load balancer not found', reqId);
                                                callback(undefined, gatewayList);
                                            }
                                        }
                                        else
                                        {
                                            logger.warn('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] - [%s] - cluster query returned empty', reqId);
                                            callback(undefined, gatewayList);
                                        }


                                    }).catch(function (err)
                                    {
                                        logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] - [%s] - PGSQL Get Cloud - LoadBalancer - Trunk query failed', reqId, err);

                                        callback(err, gatewayList);
                                    });
                            }
                            catch (ex)
                            {
                                callback(ex, undefined);
                            }

                        }
                        else
                        {
                            logger.warn('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] - [%s] - Sip network profile not connected to call server or call server connected is not in cluster', reqId);

                            callback(undefined, gatewayList);
                        }

                    }
                    else
                    {
                        logger.info('[DVP-DynamicConfigurationGenerator.GetPhoneNumberDetails] - PGSQL Get SipNetworkProfile query success');
                        callback(new Error("Profile not found"), undefined);
                    }
                }
                catch(ex)
                {
                    callback(ex, undefined);
                }

            }).catch(function(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get SipNetworkProfile query failed', err);
                callback(err, undefined);
            });

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

//Done
var ValidateBlacklistNumber = function(phnNum, companyId, tenantId, data, callback)
{
    try
    {

        redisHandler.GetObjectParseJson(null, 'NUMBERBLACKLIST:' + tenantId + ':' + companyId + ':' + phnNum, function(err, blNum)
        {
            callback(err, blNum);
        });

    }
    catch(ex)
    {
        callback(ex, null);
    }
};

//Incomplete
var GetGatewayForOutgoingRequest = function(fromNumber, lbId, data, callback)
{
    var outgoingRequest = {
        LimitId: "",
        GwIpUrl: "",
        OutboundLimit: "",
        BothLimit: ""
    };

    redisHandler.GetObjectParseJson(null, 'TRUNKNUMBER:' + fromNumber, function(err, result)
    {
        if (result && result.TrunkId && (result.ObjCategory === 'OUTBOUND' || result.ObjCategory === 'BOTH'))
        {
            redisHandler.GetObjectParseJson(null, 'TRUNK:' + result.TrunkId, function(err, trInfo)
            {
                if(trInfo)
                {
                    if(result.OutboundLimitId)
                    {
                        outgoingRequest.OutboundLimit = result.OutboundLimitId;
                    }

                    if(result.BothLimitId)
                    {
                        outgoingRequest.BothLimit = result.BothLimitId;
                    }

                    if(trInfo.IpUrl)
                    {
                        outgoingRequest.GwIpUrl = trInfo.IpUrl;
                    }

                    callback(undefined, outgoingRequest);

                }
                else
                {
                    callback(new Error('Trunk not found'), null);
                }
            });

        }
        else
        {
            callback(new Error('Phone number not added to trunk'), null);
        }
    });


};

//Incomplete
var GetCloudForUser = function(username, data, callback)
{
    var incomingRequest = {};

    dbModel.SipUACEndpoint.find({where:[{SipUsername: username}]})
        .then(function(sipUsr)
        {
            if(sipUsr && sipUsr.CompanyId && sipUsr.TenantId)
            {
                var companyId = sipUsr.CompanyId;
                var tenantId = sipUsr.TenantId;

                dbModel.CloudEndUser
                    .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                    .then(function (endUser)
                    {
                        if(endUser && endUser.SIPConnectivityProvision)
                        {
                            logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud end user query success');
                            var provisionMechanism = endUser.SIPConnectivityProvision;

                            switch(provisionMechanism)
                            {
                                case 1:
                                {
                                    //find call server
                                    dbModel.CallServer
                                        .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                                        .then(function (cs)
                                        {
                                            if(cs)
                                            {
                                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get call server query success');
                                                //call server found
                                                incomingRequest.IpCode = cs.InternalMainIP;
                                                incomingRequest.LoadBalanceType = "cs";

                                                callback(undefined, incomingRequest);

                                            }
                                            else
                                            {
                                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get call server query success');
                                                callback(new Error('Cannot find a call server dedicated to company number'), undefined);
                                            }

                                        }).catch(function(err)
                                        {
                                            logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get call server query failed', err);
                                            callback(err, undefined);
                                        });
                                }
                                    break;
                                case 2:
                                {
                                    //find call server that matches profile
                                    dbModel.SipNetworkProfile
                                        .find({where :[{CompanyId: companyId}, {TenantId: tenantId}, {ObjType: "INTERNAL"}], include : [{model: dbModel.CallServer, as: "CallServer"}]})
                                        .then(function (res)
                                        {
                                            if(res)
                                            {
                                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get sip profile query success');
                                                if(res.CallServer)
                                                {
                                                    incomingRequest.IpCode = res.CallServer.InternalMainIP;
                                                    incomingRequest.LoadBalanceType = "cs";

                                                    callback(undefined, incomingRequest);
                                                }
                                                else
                                                {
                                                    callback(new Error('call server not connected to sip profile'), undefined);
                                                }
                                            }
                                            else
                                            {
                                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get sip profile query success');
                                                callback(new Error('Cannot find a sip network profile'), undefined);
                                            }


                                        }).catch(function(err)
                                        {
                                            logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get sip profile query failed', err);
                                            callback(err, undefined);
                                        });
                                    break;
                                }
                                case 3:
                                {
                                    //find cloud code that belongs to cloud end user

                                    if(endUser.ClusterId)
                                    {
                                        var clusId = endUser.ClusterId;

                                        dbModel.Cloud
                                            .find({where :[{id: clusId}]})
                                            .then(function (clusterInfo)
                                            {
                                                if(clusterInfo)
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud query success');

                                                    incomingRequest.IpCode = clusterInfo.Code;
                                                    incomingRequest.LoadBalanceType = "cluster";

                                                    callback(undefined, incomingRequest);
                                                }
                                                else
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud query success');
                                                    callback(new Error('Cannot find a cloud for end user'), undefined);
                                                }

                                            }).catch(function(err)
                                            {
                                                logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud query failed', err);
                                                callback(err, undefined);
                                            });

                                    }
                                    else
                                    {
                                        callback(new Error('Cluster Id not set'), undefined);
                                    }
                                    break;

                                }
                                default:
                                {
                                    callback(new Error('Invalid provision mechanism'), undefined);
                                    break;
                                }
                            }
                        }
                        else
                        {
                            logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud end user query success');
                            callback(new Error('Cloud Enduser not found'), undefined);
                        }

                    }).catch(function(err)
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForUser] PGSQL Get cloud end user query failed', err);
                        callback(err, undefined);
                    });

            }
            else
            {
                callback(new Error('User not found'), undefined);
            }
        })
        .catch(function(err)
        {
            logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] Error occurred', err);
            callback(err, undefined);
        })


}

//Incomplete
var GetCloudForIncomingRequest = function(toNumber, fromIp, data, callback)
{
    var incomingRequest = {
        InboundLimit: "",
        BothLimit: "",
        IpCode: "",
        LoadBalanceType: ""
    };


    redisHandler.GetObjectParseJson(null, 'TRUNKNUMBER:' + toNumber, function(err, phnInfo)
    {
        if (phnInfo && phnInfo.TrunkId && (phnInfo.ObjCategory === 'INBOUND' || phnInfo.ObjCategory === 'BOTH'))
        {
            redisHandler.GetObjectParseJson(null, 'TRUNK:' + phnInfo.TrunkId, function(err, trInfo)
            {
                if(trInfo && trInfo.TrunkIpAddress)
                {
                    var isValidIp = ipValidator.ValidateRange(fromIp, trInfo.TrunkIpAddress);

                    if(isValidIp)
                    {
                        var companyId = phnInfo.CompanyId;
                        var tenantId = phnInfo.TenantId;

                        if(phnInfo.InboundLimitId != null)
                        {
                            incomingRequest.InboundLimit = phnInfo.InboundLimitId;
                        }

                        if(phnInfo.BothLimitId)
                        {
                            incomingRequest.BothLimit = phnInfo.BothLimitId;
                        }

                        redisHandler.GetObjectParseJson(null, 'DVPCACHE:' + tenantId + ':' + companyId, function(err, data)
                        {
                            if(data && data.CloudEndUser && Object.keys(data.CloudEndUser).length > 0)
                            {
                                var endUser = underscore.find(data.CloudEndUser, function(eu)
                                {
                                    return eu;
                                });

                                if(endUser && endUser.SIPConnectivityProvision)
                                {
                                    var provisionMechanism = endUser.SIPConnectivityProvision;

                                    switch(provisionMechanism)
                                    {
                                        case 1:
                                        {
                                            //find call server

                                            if(data.CallServer && Object.keys(data.CallServer).length > 0)
                                            {
                                                var cs = underscore.find(data.CallServer, function(cls)
                                                {
                                                    return cls;
                                                });

                                                incomingRequest.IpCode = cs.InternalMainIP;
                                                incomingRequest.LoadBalanceType = "cs";

                                                callback(undefined, incomingRequest);
                                            }
                                            else
                                            {
                                                callback(new Error('Callserver not found'), null);
                                            }

                                            break;

                                        }

                                        case 2:
                                        {
                                            //find call server that matches profile

                                            if(data.SipNetworkProfile)
                                            {
                                                var prof = underscore.find(data.SipNetworkProfile, function(profile)
                                                {
                                                    return profile.ObjType === "INTERNAL"
                                                });

                                                if(prof && prof.CallServerId)
                                                {
                                                    redisHandler.GetObjectParseJson(null, 'CALLSERVER:' + prof.CallServerId, function(err, csInfo)
                                                    {
                                                        if(csInfo)
                                                        {
                                                            incomingRequest.IpCode = csInfo.InternalMainIP;
                                                            incomingRequest.LoadBalanceType = "cs";

                                                            callback(undefined, incomingRequest);
                                                        }
                                                        else
                                                        {
                                                            callback(new Error('Callserver not found'), null);
                                                        }
                                                    });
                                                }
                                                else
                                                {
                                                    callback(new Error('cs not tagged to profile'), null);
                                                }
                                            }
                                            else
                                            {
                                                callback(new Error('Sip Network profile not found'), null);
                                            }

                                            break;

                                        }
                                        case 3:
                                        {
                                            //find cloud code that belongs to cloud end user

                                            if(endUser.ClusterId)
                                            {
                                                var clusId = endUser.ClusterId;

                                                redisHandler.GetObjectParseJson(null, 'CLOUD:' + clusId, function(err, clusterInfo)
                                                {
                                                    if(clusterInfo)
                                                    {
                                                        incomingRequest.IpCode = clusterInfo.Code;
                                                        incomingRequest.LoadBalanceType = "cluster";

                                                        callback(undefined, incomingRequest);
                                                    }
                                                    else
                                                    {
                                                        callback(new Error('Cannot find a cloud for end user'), null);
                                                    }
                                                });

                                            }
                                            else
                                            {
                                                callback(new Error('Cluster Id not set'), undefined);
                                            }
                                            break;

                                        }
                                        default:
                                        {
                                            callback(new Error('Invalid provision mechanism'), undefined);
                                            break;
                                        }
                                    }
                                }
                                else
                                {
                                    callback(new Error('Enduser not found'), null);
                                }
                            }
                            else
                            {
                                callback(new Error('Cloud Enduser not found'), null);
                            }

                        });
                    }
                    else
                    {
                        callback(new Error('Invalid Ip'), null);
                    }

                }
                else
                {
                    callback(new Error('Trunk or Ip addresses not found'), null);
                }
            })

        }
        else
        {
            callback(new Error('Phone number not found'), null);
        }
    });


};

//Not in use
var GetCallServerClusterDetailsDB = function(csId, data, callback)
{
    try
    {
        dbModel.CallServer
            .find({where :[{id: csId}], include: [{model: dbModel.Cloud, as: 'Cloud', include: [{model: dbModel.LoadBalancer, as: 'LoadBalancer'}]}]})
            .then(function (cloudInfo)
            {
                callback(undefined, cloudInfo);
            })
            .catch(function(err)
            {
                callback(err, undefined);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};


module.exports.GetUserBy_Name_Domain = GetUserBy_Name_Domain;
module.exports.GetUserBy_Ext_Domain = GetUserBy_Ext_Domain;
module.exports.GetGatewayListForCallServerProfile = GetGatewayListForCallServerProfile;
module.exports.GetCloudForIncomingRequest = GetCloudForIncomingRequest;
module.exports.GetGatewayForOutgoingRequest = GetGatewayForOutgoingRequest;
module.exports.GetContext = GetContext;
module.exports.GetPhoneNumberDetails = GetPhoneNumberDetails;
module.exports.GetGroupBy_Name_Domain = GetGroupBy_Name_Domain;
module.exports.GetAllDataForExt = GetAllDataForExt;
module.exports.GetExtensionForDid = GetExtensionForDid;
module.exports.GetExtensionDB = GetExtensionDB;
module.exports.GetEmergencyNumber = GetEmergencyNumber;
module.exports.GetUserByNameTenantDB = GetUserByNameTenantDB;
module.exports.GetTransferCodesForTenantDB = GetTransferCodesForTenantDB;
module.exports.GatherFromUserDetails = GatherFromUserDetails;
module.exports.GetCallServerClusterDetailsDB = GetCallServerClusterDetailsDB;
module.exports.GetUserDetailsByUsername = GetUserDetailsByUsername;
module.exports.GetCallServersForEndUserDB = GetCallServersForEndUserDB;
module.exports.GetPublicClusterDetailsDB = GetPublicClusterDetailsDB;
module.exports.GetCloudForUser = GetCloudForUser;
module.exports.GetGroupByExtension = GetGroupByExtension;
module.exports.ValidateBlacklistNumber = ValidateBlacklistNumber;
module.exports.GetCacheObject = GetCacheObject;