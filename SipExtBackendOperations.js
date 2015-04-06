var dbModel = require('./DVP-DBModels');

var GetUserBy_Ext_Domain = function(extension, domain, callback)
{
    try
    {
        dbModel.CloudEndUser
            .find({where: {Domain: domain}, include: [{model: dbModel.SipUACEndpoint, where: {SipExtension: extension}}]})
            .complete(function (err, ext)
            {
                try
                {
                    if (!!err) {
                        callback(err, undefined);
                    }
                    else if (!ext) {
                        callback(undefined, undefined);
                    }
                    else {
                        callback(undefined, ext);
                    }
                }
                catch (ex) {

                    callback(undefined, undefined);
                }

            })
    }
    catch(ex)
    {
        console.log(ex.toString());
    }
}

var GetUserBy_Name_Domain = function(extName, domain, callback)
{
    try
    {
        dbModel.CloudEndUser
            .find({where: {Domain: domain}, include: [{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint", where: {SipUsername: extName}}]})
            .complete(function (err, ext)
            {
                try
                {
                    if (!!err) {
                        callback(err, undefined);
                    }
                    else if (!ext) {
                        callback(undefined, undefined);
                    }
                    else {
                        callback(undefined, ext);
                    }
                }
                catch (ex) {

                    callback(undefined, undefined);
                }

            })

        }
    catch(ex)
    {
        console.log(ex.toString());
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
                callback(err, grpData);

            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
}

var GetContext = function(context, callback)
{
    try
    {
        dbModel.Context
            .find({where :[{Context: context}]})
            .complete(function (err, ctxt)
            {
                try
                {
                    callback(err, ctxt);
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
}

var GetPhoneNumberDetails = function(phnNum, callback)
{
    try
    {
        dbModel.TrunkPhoneNumber
            .find({where :[{PhoneNumber: phnNum},{Enable: true}]})
            .complete(function (err, phnInfo)
            {
                try
                {
                    callback(err, phnInfo);
                }
                catch(ex)
                {
                    callback(ex, undefined);
                }


            })
    }
    catch(ex)
    {
        callback(ex, undefined);
    }
};

var GetGatewayListForCallServerProfile = function(profile, csId, callback)
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
                        callback(err, undefined);
                    }
                    else if(result)
                    {
                        //check profile contains direct trunk map
                        if(result)
                        {
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

                            //Try finding gateways connecting to cloud directly

                            if(result.CallServer != null && result.CallServer.ClusterId)
                            {
                                //get cloud -> get loadbalancer -> get trunks

                                try
                                {
                                    dbModel.Cloud
                                        .find({where :[{id: result.CallServer.ClusterId}], include: [{model: dbModel.LoadBalancer, as: "LoadBalancer", include: [{model: dbModel.Trunk, as: "Trunk"}]}]})
                                        .complete(function (err, result)
                                        {
                                            if(result)
                                            {
                                                if(result.LoadBalancer != null && result.LoadBalancer.Trunk != null)
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


                                                }

                                            }


                                        });
                                }
                                catch(ex)
                                {
                                    callback(ex, undefined);
                                }

                            }

                            callback(undefined, gatewayList);

                        }
                    }
                    else
                    {
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
                callback(err, undefined);
            }
            else if(result)
            {
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
                    callback(err, undefined);
                }
                else if(phn && phn.CompanyId && phn.TenantId)
                {
                    //record found
                    var companyId = phn.CompanyId;
                    var tenantId = phn.TenantId;

                    dbModel.CloudEndUser
                        .find({where :[{CompanyId: companyId}, {TenantId: tenantId}]})
                        .complete(function (err, endUser)
                        {
                            if(err)
                            {
                                callback(err, undefined);
                            }
                            else if(endUser && endUser.SIPConnectivityProvision)
                            {
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
                                                    callback(err, undefined);
                                                }
                                                else if(cs)
                                                {
                                                    //call server found
                                                    incomingRequest.LimitId = phn.LimitId;
                                                    incomingRequest.IpCode = cs.InternalMainIP;
                                                    incomingRequest.LoadBalanceType = "cs";

                                                    callback(undefined, incomingRequest);

                                                }
                                                else
                                                {
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
                                                    callback(err, undefined);
                                                }
                                                else if(res)
                                                {
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
                                                        callback(err, undefined);
                                                    }
                                                    else if(clusterInfo)
                                                    {
                                                        incomingRequest.LimitId = phn.LimitId;
                                                        incomingRequest.IpCode = clusterInfo.Code;
                                                        incomingRequest.LoadBalanceType = "cluster";

                                                        callback(undefined, incomingRequest);
                                                    }
                                                    else
                                                    {
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
                                callback(new Error('Cloud Enduser not found'), undefined);
                            }

                        });

                }
                else
                {
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

