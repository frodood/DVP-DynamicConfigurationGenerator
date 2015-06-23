var dbModel = require('DVP-DBModels');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;

var GetUserBy_Ext_Domain = function(extension, domain, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: {SipExtension: extension}, include: [{model: dbModel.CloudEndUser, as: "CloudEndUser", where: {Domain: domain}}]})
            .complete(function (err, ext)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetUserBy_Ext_Domain] PGSQL Get sip endpoint for ext domain query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetUserBy_Ext_Domain] PGSQL Get sip endpoint for ext domain query success');
                }
                callback(err, ext);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetUserBy_Name_Domain = function(extName, domain, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: {SipUsername: extName}, include: [{model: dbModel.CloudEndUser, as: "CloudEndUser", where: {Domain : domain}}]})
            .complete(function (err, ext)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetUserBy_Name_Domain] PGSQL Get sip endpoint for username domain query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetUserBy_Name_Domain] PGSQL Get sip endpoint for username domain query success');
                }

                callback(err, ext);
            })

        }
    catch(ex)
    {
        callback(ex, undefined);
    }


};

var GetUserByNameTenantDB = function(reqId, extName, tenantId, callback)
{
    try
    {
        dbModel.SipUACEndpoint
            .find({where: [{SipUsername: extName},{TenantId: tenantId}], include:[{model: dbModel.Extension, as: 'Extension'}]})
            .complete(function (err, usr)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetUserByNameTenantDB] PGSQL Get sip endpoint for username tenant query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetUserByNameTenantDB] PGSQL Get sip endpoint for username tenant query success');
                }

                callback(err, usr);
            })

    }
    catch(ex)
    {
        callback(ex, undefined);
    }


};

var GetExtensionForDid = function(reqId, didNumber, companyId, tenantId, callback)
{
    try
    {
        dbModel.DidNumber.find({where: [{DidNumber: didNumber},{TenantId: tenantId}], include : [{model: dbModel.Extension, as: 'Extension'}]})
            .complete(function (err, didNumDetails)
            {
                if (err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - PGSQL get did number and related extension for company query failed', reqId, err);
                    callback(err, undefined);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - PGSQL get did number and related extension for company query success', reqId);
                    callback(err, didNumDetails);
                }
            });
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }

};

var GetExtensionDB = function(reqId, ext, tenantId, callback)
{
    try
    {
        dbModel.Extension.find({where: [{Extension: ext},{TenantId: tenantId}]})
            .complete(function (err, extDetails)
            {
                if (err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - PGSQL get did number and related extension for company query failed', reqId, err);
                    callback(err, undefined);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - PGSQL get did number and related extension for company query success', reqId);
                    callback(err, extDetails);
                }
            });
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.GetExtensionForDid] - [%s] - Exception occurred', reqId, ex);
        callback(ex, undefined);
    }

};

var GetAllDataForExt = function(reqId, extension, tenantId, extType, callback)
{
    try
    {
        if(extType === 'USER')
        {
            dbModel.Extension.find({where: [{Extension: extension},{TenantId: tenantId},{ObjCategory: extType}], include: [{model: dbModel.SipUACEndpoint, as:'SipUACEndpoint', include: [{model: dbModel.CloudEndUser, as:'CloudEndUser'},{model: dbModel.UserGroup, as:'UserGroup', include: [{model: dbModel.Extension, as:'Extension'}]}]}]})
                .complete(function (err, extData)
                {
                    callback(err, extData);
                });
        }
        else if(extType === 'GROUP')
        {
            dbModel.Extension.find({where: [{Extension: extension},{TenantId: tenantId},{ObjCategory: extType}], include: [{model: dbModel.UserGroup, as:'UserGroup'}]})
                .complete(function (err, extData)
                {
                    callback(err, extData);
                });
        }
        else if(extType === 'CONFERENCE')
        {
            dbModel.Extension.find({where: [{Extension: extension},{TenantId: tenantId},{ObjCategory: extType}], include: [{model: dbModel.Conference, as:'Conference', include : [{model: dbModel.ConferenceUser, as : 'ConferenceUser', include:[{model: dbModel.SipUACEndpoint, as: 'SipUACEndpoint'}]}]},{model: dbModel.CloudEndUser, as: 'CloudEndUser'}]})
                .complete(function (err, extData)
                {
                    callback(err, extData);
                });
        }
        else if(extType === 'VOICE_PORTAL')
        {
            dbModel.Extension.find({where: [{Extension: extension},{TenantId: tenantId},{ObjCategory: extType}]})
                .complete(function (err, extData)
                {
                    callback(err, extData);
                });
        }
        else
        {
            callback(new Error('Unsupported extension type'), undefined);
        }

    }
    catch(ex)
    {
        callback(ex, false);
    }

};

var GetGroupBy_Name_Domain = function(grpName, domain, callback)
{
    try
    {
        dbModel.UserGroup
            .find({where: [{Domain: domain},{GroupName: grpName}], include: [{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint", include:[{model: dbModel.CloudEndUser, as : "CloudEndUser"}]}, {model: dbModel.Extension, as: "Extension"}]})
            .complete(function (err, grpData)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetGroupBy_Name_Domain] PGSQL Get user group query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetGroupBy_Name_Domain] PGSQL Get user group query success');
                }

                callback(err, grpData);

            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetContext = function(context, callback)
{
    try
    {
        dbModel.Context
            .find({where :[{Context: context}]})
            .complete(function (err, ctxt)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetContext] PGSQL Get context query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetContext] PGSQL Get context query success');
                }

                callback(err, ctxt);

            });

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetEmergencyNumber = function(numb, tenantId, callback)
{
    try
    {
        dbModel.EmergencyNumber
            .find({where :[{EmergencyNum: numb},{TenantId: tenantId}]})
            .complete(function (err, eNum)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetContext] PGSQL Get emergency number query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetContext] PGSQL Get emergency number query success');
                }

                callback(err, eNum);

            });

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
}

var GetPhoneNumberDetails = function(phnNum, callback)
{
    try
    {
        dbModel.TrunkPhoneNumber
            .find({where :[{PhoneNumber: phnNum},{Enable: true}], include: [{model: dbModel.LimitInfo, as: 'LimitInfoInbound'},{model: dbModel.LimitInfo, as: 'LimitInfoBoth'},{model:dbModel.Trunk, as : 'Trunk'}]})
            .complete(function (err, phnInfo)
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetPhoneNumberDetails] PGSQL Get phone num details query failed', err);
                }
                else
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetPhoneNumberDetails] PGSQL Get phone num details query success');
                }

                callback(err, phnInfo);
            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetGatewayListForCallServerProfile = function(profile, csId, reqId, callback)
{
    try
    {
        var gatewayList = [];

        dbModel.SipNetworkProfile
            .find({where :[{ProfileName: profile},{ObjType: 'EXTERNAL'}], include: [{model: dbModel.CallServer, as: "CallServer", where:[{Code: csId}]},{model: dbModel.Trunk, as: "Trunk"}]})
            .complete(function (err, result)
            {
                try
                {
                    if(err)
                    {
                        logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get SipNetworkProfile query failed', err);
                        callback(err, undefined);
                    }
                    else if(result)
                    {
                        logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get SipNetworkProfile query success');
                        //check profile contains direct trunk map

                            //direct trunk termination
                            if(result.Trunk != null)
                            {
                                var trunkList = result.Trunk;

                                trunkList.forEach(function(trunk)
                                {
                                    var gw = {
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
                                    dbModel.Cloud
                                        .find({where :[{id: result.CallServer.ClusterId}], include: [{model: dbModel.LoadBalancer, as: "LoadBalancer", include: [{model: dbModel.Trunk, as: "Trunk"}]}]})
                                        .complete(function (err, result)
                                        {
                                            if(err)
                                            {
                                                logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] - [%s] - PGSQL Get Cloud - LoadBalancer - Trunk query failed', reqId, err);

                                                callback(undefined, gatewayList);
                                            }
                                            else
                                            {
                                                logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayListForCallServerProfile] PGSQL Get Cloud - LoadBalancer - Trunk query success');

                                                if(result)
                                                {
                                                    if(result.LoadBalancer && result.LoadBalancer.Trunk)
                                                    {
                                                        var trunkList = result.LoadBalancer.Trunk;

                                                        trunkList.forEach(function(trunk)
                                                        {
                                                            var gw = {
                                                                IpUrl : trunk.IpUrl,
                                                                Domain : result.InternalIp,
                                                                TrunkCode: trunk.TrunkCode,
                                                                Proxy: result.LoadBalancer.MainIp
                                                            };
                                                            gatewayList.push(gw);
                                                        })

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
                                            }


                                        });
                                }
                                catch(ex)
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

            });

    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetGatewayForOutgoingRequest = function(fromNumber, lbId, callback)
{
    var outgoingRequest = {
        LimitId: "",
        GwIpUrl: ""
    };

    dbModel.TrunkPhoneNumber
        .find({where :[{PhoneNumber: fromNumber}], include : [{model: dbModel.Trunk, as: "Trunk"}]})
        .complete(function (err, result)
        {
            if(err)
            {
                logger.error('[DVP-DynamicConfigurationGenerator.GetGatewayForOutgoingRequest] PGSQL Get trunk number query failed', err);
                callback(err, undefined);
            }
            else if(result)
            {
                logger.debug('[DVP-DynamicConfigurationGenerator.GetGatewayForOutgoingRequest] PGSQL Get trunk number query success');
                if(result.Trunk)
                {
                    if(result.LimitId)
                    {
                        outgoingRequest.LimitId = result.LimitId;
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

        });
}

var GetCloudForIncomingRequest = function(toNumber, lbId, callback)
{
    var incomingRequest = {
        LimitId: "",
        IpCode: "",
        LoadBalanceType: ""
    };

    dbModel.TrunkPhoneNumber
        .find({where :[{PhoneNumber: toNumber}]})
        .complete(function (err, phn)
        {
            try
            {
                if(err)
                {
                    logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get trunk number query failed', err);
                    callback(err, undefined);
                }
                else if(phn && phn.CompanyId && phn.TenantId)
                {
                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get trunk number query success');
                    //record found
                    var companyId = phn.CompanyId;
                    var tenantId = phn.TenantId;

                    dbModel.CloudEndUser
                        .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                        .complete(function (err, endUser)
                        {
                            if(err)
                            {
                                logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud end user query failed', err);
                                callback(err, undefined);
                            }
                            else if(endUser && endUser.SIPConnectivityProvision)
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
                                            .complete(function (err, cs)
                                            {
                                                if(err)
                                                {
                                                    logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query failed', err);
                                                    callback(err, undefined);
                                                }
                                                else if(cs)
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query success');
                                                    //call server found
                                                    incomingRequest.LimitId = phn.LimitId;
                                                    incomingRequest.IpCode = cs.InternalMainIP;
                                                    incomingRequest.LoadBalanceType = "cs";

                                                    callback(undefined, incomingRequest);

                                                }
                                                else
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get call server query success');
                                                    callback(new Error('Cannot find a call server dedicated to company number'), undefined);
                                                }

                                            });
                                    }
                                        break;
                                    case 2:
                                    {
                                        //find call server that matches profile
                                        dbModel.SipNetworkProfile
                                            .find({where :[{CompanyId: companyId}, {TenantId: tenantId}, {ObjType: "INTERNAL"}], include : [{model: dbModel.CallServer, as: "CallServer"}]})
                                            .complete(function (err, res)
                                            {
                                                if(err)
                                                {
                                                    logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get sip profile query failed', err);
                                                    callback(err, undefined);
                                                }
                                                else if(res)
                                                {
                                                    logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get sip profile query success');
                                                    if(res.CallServer)
                                                    {
                                                        incomingRequest.LimitId = phn.LimitId;
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
                                                .complete(function (err, clusterInfo)
                                                {
                                                    if(err)
                                                    {
                                                        logger.error('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query failed', err);
                                                        callback(err, undefined);
                                                    }
                                                    else if(clusterInfo)
                                                    {
                                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query success');
                                                        incomingRequest.LimitId = phn.LimitId;
                                                        incomingRequest.IpCode = clusterInfo.Code;
                                                        incomingRequest.LoadBalanceType = "cluster";

                                                        callback(undefined, incomingRequest);
                                                    }
                                                    else
                                                    {
                                                        logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud query success');
                                                        callback(new Error('Cannot find a cloud for end user'), undefined);
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
                                logger.debug('[DVP-DynamicConfigurationGenerator.GetCloudForIncomingRequest] PGSQL Get cloud end user query success');
                                callback(new Error('Cloud Enduser not found'), undefined);
                            }

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

        });


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

