/**
 * Created by dinusha on 3/9/2016.
 */
var dbModel = require('dvp-dbmodels');
var redisHandler = require('./RedisHandler.js');

var AddContexts = function()
{
    try
    {
        dbModel.Context.findAll()
            .then(function (contextList)
            {
                if(contextList.length)
                {
                    var ctxtCount = 0;
                    for(i=0; i<contextList.length; i++)
                    {
                        var ctxtName = contextList[i].Context;

                        if(ctxtName)
                        {
                            redisHandler.SetObject('CONTEXT:' + ctxtName, JSON.stringify(contextList[i]), function(err, res)
                            {
                                ctxtCount++;

                                if(contextList.length == ctxtCount)
                                {
                                    console.log('CONTEXT ADD COMPLETED');
                                }

                            })
                        }
                        else
                        {
                            ctxtCount++;

                            if(contextList.length == ctxtCount)
                            {
                                console.log('CONTEXT ADD COMPLETED');
                            }
                        }

                    }
                }
                else
                {
                    console.log('CONTEXT : COUNT 0')
                }

            })
            .catch(function(err)
            {
                console.log('CONTEXT PGSQL : ERROR');
            });
    }
    catch(ex)
    {
        console.log('CONTEXT : ERROR');
    }
};

var AddPhoneNumbers = function()
{
    try
    {
        dbModel.TrunkPhoneNumber.findAll()
            .then(function (numList)
            {
                if(numList.length)
                {
                    var phnCount = 0;
                    for(i=0; i<numList.length; i++)
                    {
                        var phnNumber = numList[i].PhoneNumber;

                        if(phnNumber)
                        {
                            redisHandler.SetObject('TRUNKNUMBER:' + phnNumber, JSON.stringify(numList[i]), function(err, res)
                            {
                                phnCount++;

                                if(numList.length == phnCount)
                                {
                                    console.log('TRUNKNUMBER ADD COMPLETED');
                                }

                            })
                        }
                        else
                        {
                            phnCount++;

                            if(numList.length == phnCount)
                            {
                                console.log('TRUNKNUMBER ADD COMPLETED');
                            }
                        }

                    }
                }
                else
                {
                    console.log('TRUNKNUMBER : COUNT 0')
                }

            })
            .catch(function(err)
            {
                console.log('TRUNKNUMBER PGSQL : ERROR');
            });
    }
    catch(ex)
    {
        console.log('TRUNKNUMBER : ERROR');
    }
};

var AddTrunks = function()
{
    try
    {
        dbModel.Trunk.findAll({include : [{model: dbModel.TrunkIpAddress, as: "TrunkIpAddress"}]})
            .then(function (trunkList)
            {
                if(trunkList.length)
                {
                    var trCount = 0;
                    for(i=0; i<trunkList.length; i++)
                    {
                        var trunkId = trunkList[i].id;

                        if(trunkId)
                        {
                            redisHandler.SetObject('TRUNK:' + trunkId, JSON.stringify(trunkList[i]), function(err, res)
                            {
                                trCount++;

                                if(trunkList.length == trCount)
                                {
                                    console.log('TRUNK ADD COMPLETED');
                                }

                            })
                        }
                        else
                        {
                            trCount++;

                            if(trunkList.length == trCount)
                            {
                                console.log('TRUNK ADD COMPLETED');
                            }
                        }

                    }
                }
                else
                {
                    console.log('TRUNK : COUNT 0')
                }

            })
            .catch(function(err)
            {
                console.log('TRUNK PGSQL : ERROR');
            });
    }
    catch(ex)
    {
        console.log('TRUNK : ERROR');
    }
};

var AddUsers = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.SipUACEndpoint = {};
        dbModel.SipUACEndpoint.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].SipUsername;

                    if (key)
                    {
                        obj.SipUACEndpoint[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddExtensions = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.Extension = {};
        dbModel.Extension.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].Extension;

                    if (key)
                    {
                        obj.Extension[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddTransferCode = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.TransferCode = {};
        dbModel.TransferCode.find({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                if(list)
                {
                    obj.TransferCode = list;
                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddPhoneNumbersForCompany = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.TrunkPhoneNumber = {};
        dbModel.TrunkPhoneNumber.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.TrunkPhoneNumber[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddCloudEndUser = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.CloudEndUser = {};
        dbModel.CloudEndUser.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.CloudEndUser[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddNumberBlacklist = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.DidNumber = {};
        dbModel.DidNumber.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].DidNumber;

                    if (key)
                    {
                        obj.DidNumber[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddCallRule = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.CallRule = {};
        dbModel.CallRule.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.CallRule[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddApplication = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.Application = {};
        dbModel.Application.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.Application[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddTranslation = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.Translation = {};
        dbModel.Translation.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.Translation[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddLimitInfo = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.LimitInfo = {};
        dbModel.LimitInfo.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].LimitId;

                    if (key)
                    {
                        obj.LimitInfo[key] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddUserGroup = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.UserGroup = [];
        dbModel.UserGroup.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}], include : [{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint"}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    obj.UserGroup.push(list[i]);

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddPBXUsers = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.PBXUser = {};
        dbModel.PBXUser.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}], include : [{model: dbModel.PBXUserTemplate, as: "PBXUserTemplateActive"}, {model: dbModel.FollowMe, as: "FollowMe", include: [{model: dbModel.PBXUser, as: "DestinationUser"}]}, {model: dbModel.Forwarding, as: "Forwarding"}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var userUuid = list[i].UserUuid;

                    if(userUuid)
                    {
                        obj.PBXUser[userUuid] = list[i];
                    }

                }

                callback(obj)

            })
            .catch(function(err)
            {
                callback(obj)
            });
    }
    catch(ex)
    {
        callback(obj)
    }
};

var AddFeatureCodes = function(companyId, tenantId, obj, callback)
{

}

var CreatePABXData = function(companyId, tenantId, obj, callback)
{

}

var CreateDataObject = function(companyId, tenantId, obj, callback)
{

    AddUsers(companyId, tenantId, obj, function(data)
    {
        AddExtensions(companyId, tenantId, data, function(data)
        {
            AddTransferCode(companyId, tenantId, data, function(data)
            {
                AddCloudEndUser(companyId, tenantId, data, function(data)
                {
                    AddNumberBlacklist(companyId, tenantId, data, function(data)
                    {
                        AddCallRule(companyId, tenantId, data, function(data)
                        {
                            AddApplication(companyId, tenantId, data, function(data)
                            {
                                AddTranslation(companyId, tenantId, data, function(data)
                                {
                                    AddUserGroup(companyId, tenantId, data, function(data)
                                    {
                                        AddLimitInfo(companyId, tenantId, data, function(data)
                                        {
                                            AddPhoneNumbersForCompany(companyId, tenantId, data, function(data)
                                            {
                                                callback(data);
                                            })

                                        })
                                    })

                                })

                            })

                        })

                    })

                })

            })

        })
    })
};

var CreateCompanyData = function()
{
    dbModel.CloudEndUser.findAll()
        .then(function (list)
        {
            if(list.length)
            {
                for(i=0; i<list.length; i++)
                {
                    var companyId = list[i].CompanyId;
                    var tenantId = list[i].TenantId;

                    CreateDataObject(companyId, tenantId, {}, function(obj)
                    {
                        if(obj)
                        {
                            redisHandler.SetObject('DVPCACHE:' + tenantId + ':' + companyId, JSON.stringify(obj), function(err, res)
                            {


                            })
                        }
                    })



                }
            }

        })
        .catch(function(err)
        {
            console.log('ERROR');
        });

};

var BuildGlobalData = function()
{
    AddContexts();
    AddPhoneNumbers();
    AddTrunks();

    CreateCompanyData();

};

BuildGlobalData();