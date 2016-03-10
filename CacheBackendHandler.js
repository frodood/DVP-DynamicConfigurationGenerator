var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var dbModel = require('dvp-dbmodels');
var underscore = require('underscore');
var redisHandler = require('./RedisHandler.js');

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
var GatherFromUserDetails = function(reqId, usrName, tenantId, ignoreTenant, data, callback)
{
    GetUserByNameTenantDB(reqId, usrName, tenantId, ignoreTenant, data, function(err, res)
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
var GetUserByNameTenantDB = function(reqId, extName, tenantId, ignoreTenant, data, callback)
{
    try
    {
        if(!ignoreTenant)
        {
            var err = undefined;
            if(data && data.SipUACEndpoint)
            {
                var usr = data.SipUACEndpoint[extName];

                if(usr)
                {
                    if(usr.ExtensionId)
                    {
                        if(data.Extension)
                        {
                            var extTemp = underscore.find(data.Extension, function(ext)
                            {
                                return ext.id === usr.ExtensionId
                            });

                            usr.Extension = extTemp;
                        }

                    }

                }
            }
            else
            {
                err = new Error('Error getting SipUACEndpoint');
            }

            callback(err, usr);
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
var GetExtensionForDid = function(reqId, didNumber, companyId, tenantId, data, callback)
{
    try
    {
        var err = undefined;
        if(data && data.DidNumber)
        {
            var did = data.DidNumber[didNumber];

            if(did)
            {
                if(did.ExtensionId)
                {
                    if(data.Extension)
                    {
                        var extTemp = underscore.find(data.Extension, function(ext)
                        {
                            return ext.id === did.ExtensionId
                        });

                        did.Extension = extTemp;
                    }

                }

            }
        }
        else
        {
            err = new Error('Error getting data from cache');
        }

        callback(err, did);

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }

};

//Done
var GetExtensionDB = function(reqId, ext, tenantId, data, callback)
{
    try
    {

        if(data && data.Extension)
        {
            var extDetails = data.Extension[ext];

            callback(undefined, extDetails);
        }
        else
        {
            callback(new Error('Error getting cache data'), undefined);
        }
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

//Done - Without Conference
var GetAllDataForExt = function(reqId, extension, tenantId, extType, callServerId, data, callback)
{
    try
    {

        if(extType === 'USER')
        {
            if(data && data.Extension)
            {
                var extData = underscore.find(data.Extension, function(ext)
                {
                    return ext.Extension === extension && ext.ObjCategory === extType
                });

                if(extData)
                {
                    if(data.SipUACEndpoint)
                    {
                        var usrTemp = underscore.find(data.SipUACEndpoint, function (usr)
                        {
                            return usr.ExtensionId === extData.id
                        });

                        if (usrTemp)
                        {
                            extData.SipUACEndpoint = usrTemp;

                            if (data.CloudEndUser)
                            {
                                var ceTemp = data.CloudEndUser[usrTemp.CloudEndUserId];

                                if (ceTemp)
                                {
                                    usrTemp.CloudEndUser = ceTemp;
                                }

                            }

                            if (data.UserGroup)
                            {
                                var curGrp = null;
                                for(i=0; i<data.UserGroup.length; i++)
                                {
                                    var users = data.UserGroup[i].SipUACEndpoint;

                                    if(users)
                                    {
                                        var usrGrpTemp = underscore.find(users, function (usrGrp)
                                        {
                                            return usrGrp.id === usrTemp.id
                                        });

                                        if(usrGrpTemp)
                                        {
                                            curGrp = data.UserGroup[i];
                                            break;
                                        }
                                    }
                                }

                                if(curGrp)
                                {
                                    var usrGrpArr = [];
                                    usrGrpArr.push(curGrp);
                                    var extGrpTemp = underscore.find(data.Extension, function(extGrp)
                                    {
                                        return extGrp.id === curGrp.ExtensionId
                                    });

                                    curGrp.Extension = extGrpTemp;

                                    usrTemp.UserGroup = usrGrpArr;
                                }

                            }
                        }


                    }

                }

                if(extData && extData.SipUACEndpoint)
                {
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
                                    callback(err, extData);
                                }
                            }

                        })

                    })

                }
                else
                {
                    callback(undefined, extData);
                }
            }
            else
            {
                callback(new Error('Error getting cache data'), undefined);
            }

        }
        else if(extType === 'GROUP')
        {

            if(data && data.Extension)
            {
                var extData = underscore.find(data.Extension, function(ext)
                {
                    return ext.Extension === extension && ext.ObjCategory === extType
                });

                if(extData)
                {
                    if(data.UserGroup)
                    {
                        var grpTemp = underscore.find(data.UserGroup, function (grp)
                        {
                            return grp.ExtensionId === extData.id;
                        });

                        extData.UserGroup = grpTemp;
                    }
                }

                callback(undefined, extData);
            }
            else
            {
                callback(new Error('Error getting cache data'), undefined);
            }
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
            if(data && data.Extension)
            {
                var extData = underscore.find(data.Extension, function(ext)
                {
                    return ext.Extension === extension && ext.ObjCategory === extType
                });

                callback(undefined, extData);
            }
            else
            {
                callback(undefined, undefined);
            }
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

//Done
var GetContext = function(context, callback)
{
    try
    {
        redisHandler.GetObject(null, 'CONTEXT:' + context, function(err, ctxt)
        {
            callback(undefined, ctxt);

        });

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

//Done
var GetEmergencyNumber = function(numb, tenantId, data, callback)
{
    try
    {
        var eNum = undefined;

        if(data && data.EmergencyNumber)
        {
            eNum = data.EmergencyNumber[numb];
        }

        callback(undefined, eNum);

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

//Done
var GetPhoneNumberDetails = function(phnNum, callback)
{
    try
    {

        redisHandler.GetObject(null, 'TRUNKNUMBER:' + phnNum, function(err, phnInfo)
        {
            if(phnInfo)
            {

                if(!phnInfo.Enable)
                {
                    callback(undefined, undefined, null);
                }
                else
                {

                    redisHandler.GetObject(null, 'DVPCACHE:' + phnInfo.TenantId + ':' + phnInfo.CompanyId, function(err, data)
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

                                redisHandler.GetObject(null, 'TRUNK:' + phnInfo.TrunkId, function(err, tr)
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
        if(data)
        {
            if(data.NumberBlacklist)
            {
                var blackListNum = data.NumberBlacklist[phnNum];

                callback(undefined, blackListNum);
            }
            else
            {
                callback(undefined, undefined);
            }

        }
        else
        {
            callback(new Error('Object not found on cache'), undefined);
        }

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

    dbModel.TrunkPhoneNumber
        .find({where :[{PhoneNumber: fromNumber}], include : [{model: dbModel.Trunk, as: "Trunk"},{model: dbModel.LimitInfo, as : 'LimitInfoInbound'}, {model: dbModel.LimitInfo, as : 'LimitInfoBoth'}]})
        .then(function (result)
        {
            if(result)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayForOutgoingRequest] PGSQL Get trunk number query success');
                if(result.Trunk)
                {
                    if(result.LimitInfoOutbound && result.LimitInfoOutbound.MaxCount != null)
                    {
                        outgoingRequest.OutboundLimit = result.LimitInfoOutbound.MaxCount.toString();
                    }

                    if(result.LimitInfoBoth && result.LimitInfoBoth.MaxCount != null)
                    {
                        outgoingRequest.BothLimit = result.LimitInfoBoth.MaxCount.toString();
                    }

                    outgoingRequest.GwIpUrl = result.Trunk.IpUrl;

                    callback(undefined, outgoingRequest);

                }
                else
                {
                    callback(new Error('Trunk not added to number'), undefined);
                }
            }
            else
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayForOutgoingRequest] PGSQL Get trunk number query success');
                callback(new Error('Number not found'), undefined);
            }

        }).catch(function(err)
        {
            logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayForOutgoingRequest] PGSQL Get trunk number query failed', err);
            callback(err, undefined);
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
var GetCloudForIncomingRequest = function(toNumber, lbId, data, callback)
{
    var incomingRequest = {
        InboundLimit: "",
        BothLimit: "",
        IpCode: "",
        LoadBalanceType: ""
    };

    dbModel.TrunkPhoneNumber
        .find({where :[{PhoneNumber: toNumber}], include : [{model: dbModel.LimitInfo, as : 'LimitInfoInbound'}, {model: dbModel.LimitInfo, as : 'LimitInfoBoth'}]})
        .then(function (phn)
        {
            try
            {
                if(phn && phn.CompanyId && phn.TenantId && (phn.ObjCategory === 'INBOUND' || phn.ObjCategory === 'BOTH'))
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get trunk number query success');
                    //record found
                    var companyId = phn.CompanyId;
                    var tenantId = phn.TenantId;

                    if(phn.LimitInfoInbound && phn.LimitInfoInbound.MaxCount != null)
                    {
                        incomingRequest.InboundLimit = phn.LimitInfoInbound.MaxCount.toString();
                    }

                    if(phn.LimitInfoBoth && phn.LimitInfoBoth.MaxCount != null)
                    {
                        incomingRequest.BothLimit = phn.LimitInfoBoth.MaxCount.toString();
                    }

                    dbModel.CloudEndUser
                        .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                        .then(function (endUser)
                        {
                            if(endUser && endUser.SIPConnectivityProvision)
                            {
                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud end user query success');
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
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query success');
                                                    //call server found
                                                    incomingRequest.IpCode = cs.InternalMainIP;
                                                    incomingRequest.LoadBalanceType = "cs";

                                                    callback(undefined, incomingRequest);

                                                }
                                                else
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query success');
                                                    callback(new Error('Cannot find a call server dedicated to company number'), undefined);
                                                }

                                            }).catch(function(err)
                                            {
                                                logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query failed', err);
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
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get sip profile query success');
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
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get sip profile query success');
                                                    callback(new Error('Cannot find a sip network profile'), undefined);
                                                }


                                            }).catch(function(err)
                                            {
                                                logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get sip profile query failed', err);
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
                                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query success');

                                                        incomingRequest.IpCode = clusterInfo.Code;
                                                        incomingRequest.LoadBalanceType = "cluster";

                                                        callback(undefined, incomingRequest);
                                                    }
                                                    else
                                                    {
                                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query success');
                                                        callback(new Error('Cannot find a cloud for end user'), undefined);
                                                    }

                                                }).catch(function(err)
                                                {
                                                    logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query failed', err);
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
                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud end user query success');
                                callback(new Error('Cloud Enduser not found'), undefined);
                            }

                        }).catch(function(err)
                        {
                            logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud end user query failed', err);
                            callback(err, undefined);
                        });

                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get trunk number query success');
                    callback(new Error('Invalid phone number'), undefined);
                }
            }
            catch(ex)
            {
                callback(ex, undefined);
            }

        }).catch(function(err)
        {
            logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get trunk number query failed', err);
            callback(err, undefined);
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