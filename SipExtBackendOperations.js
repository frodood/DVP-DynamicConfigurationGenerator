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
            .find({where: {Domain: domain}, include: [{model: dbModel.SipUACEndpoint, where: {SipUsername: extName}}]})
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

var GetGatewayListForCallServerProfile = function(profile, csId, callback)
{
    try
    {
        var gatewayList = [];

        dbModel.SipNetworkProfile
            .find({where :[{ProfileName: profile},{ObjType: 'external'}], include: [{model: dbModel.CallServer, as: "CallServer", where:[{Code: csId}]},{model: dbModel.Trunk, as: "Trunk"}]})
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

var GetGatewayListForCallServerProfilee = function(profile, csId, callback)
{
    try
    {
        dbModel.SipNetworkProfile
            .find({where: [{CallServerId: csId}, {ProfileName: profile}, {ObjType: 'external'}]})
            .complete(function (err, prof)
            {
                try
                {
                    if (err)
                    {
                        callback(err, undefined);
                    }
                    else if (!prof)
                    {
                        callback(new Error('Profile Not found'), undefined);
                    }
                    else
                    {
                        dbModel.Cloud
                            .find({include: [{model: dbModel.CallServer, where: {id: csId}}]})
                            .complete(function (err, resultCsCloud)
                            {
                                try
                                {
                                    if (err)
                                    {
                                        callback(err, undefined);
                                    }
                                    else if (!resultCsCloud)
                                    {
                                        callback(new Error('Unable to find a cluster to call server'), undefined);
                                    }
                                    else
                                    {

                                        dbModel.Trunk
                                            .findAll({where: [{ClusterId: resultCsCloud.CSDB_CallServers[0].ClusterId}]})
                                            .complete(function (err, trunkRecList)
                                            {
                                                try
                                                {
                                                    if (err)
                                                    {
                                                        callback(err, undefined);
                                                    }
                                                    else if (!trunkRecList)
                                                    {
                                                        callback(new Error('Trunk not found for the cluster'), undefined);
                                                    }
                                                    else
                                                    {
                                                        var res = {
                                                            TrunkList : trunkRecList,
                                                            Profile : prof,
                                                            LoadBalancer : undefined
                                                        };

                                                        if (resultCsCloud.LoadBalancerId)
                                                        {
                                                            //Get Loadbalancer Info

                                                            dbModel.LoadBalancer
                                                                .find({where: [{id: resultCsCloud.LoadBalancerId}]})
                                                                .complete(function (err, lb)
                                                                {
                                                                    try
                                                                    {

                                                                        if (err)
                                                                        {
                                                                            callback(err, undefined);
                                                                        }
                                                                        else if (lb)
                                                                        {
                                                                            res.LoadBalancer = lb;

                                                                            callback(undefined, res);
                                                                        }
                                                                    }
                                                                    catch (ex)
                                                                    {
                                                                        callback(ex, undefined);
                                                                    }

                                                                })

                                                        }
                                                        else
                                                        {
                                                            callback(undefined, res);
                                                        }
                                                    }

                                                }
                                                catch (ex)
                                                {
                                                    callback(ex, undefined);
                                                }

                                            })


                                    }
                                }
                                catch (ex)
                                {
                                    callback(ex, undefined);
                                }

                            })
                    }
                }
                catch (ex)
                {
                    callback(ex, undefined);
                }

            })

    }
    catch(ex)
    {
        console.log(ex.toString());
    }
};

module.exports.GetUserBy_Name_Domain = GetUserBy_Name_Domain;
module.exports.GetUserBy_Ext_Domain = GetUserBy_Ext_Domain;
module.exports.GetGatewayListForCallServerProfile = GetGatewayListForCallServerProfile;

