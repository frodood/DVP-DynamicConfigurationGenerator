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

var AddCallServersGlobally = function()
{
    try
    {
        dbModel.CallServer.findAll()
            .then(function (csList)
            {
                if(csList.length)
                {
                    var csCount = 0;
                    for(i=0; i<csList.length; i++)
                    {
                        var csId = csList[i].id;

                        if(csId)
                        {
                            redisHandler.SetObject('CALLSERVER:' + csId, JSON.stringify(csList[i]), function(err, res)
                            {
                                csCount++;

                                if(csList.length == csCount)
                                {
                                    console.log('CALLSERVER ADD COMPLETED');
                                }

                            })
                        }
                        else
                        {
                            csCount++;

                            if(csList.length == csCount)
                            {
                                console.log('CALLSERVER ADD COMPLETED');
                            }
                        }

                    }
                }
                else
                {
                    console.log('CALLSERVER : COUNT 0')
                }

            })
            .catch(function(err)
            {
                console.log('CALLSERVER PGSQL : ERROR');
            });
    }
    catch(ex)
    {
        console.log('CALLSERVER : ERROR');
    }
};

var AddClusters = function()
{
    try
    {
        dbModel.Cloud.findAll({include:[{model: dbModel.LoadBalancer, as: "LoadBalancer"}]})
            .then(function (cloudList)
            {
                if(cloudList.length)
                {
                    var cloudCount = 0;
                    for(i=0; i<cloudList.length; i++)
                    {
                        var cloudId = cloudList[i].id;

                        if(cloudId)
                        {
                            redisHandler.SetObject('CLOUD:' + cloudId, JSON.stringify(cloudList[i]), function(err, res)
                            {
                                cloudCount++;

                                if(cloudList.length == cloudCount)
                                {
                                    console.log('CLOUD ADD COMPLETED');
                                }

                            })
                        }
                        else
                        {
                            cloudCount++;

                            if(cloudList.length == cloudCount)
                            {
                                console.log('CLOUD ADD COMPLETED');
                            }
                        }

                    }
                }
                else
                {
                    console.log('CLOUD : COUNT 0')
                }

            })
            .catch(function(err)
            {
                console.log('CLOUD PGSQL : ERROR');
            });
    }
    catch(ex)
    {
        console.log('CLOUD : ERROR');
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

var AddCallServers = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.CallServer = {};
        dbModel.CallServer.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.CallServer[key] = list[i];
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

var AddSipProfiles = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.SipNetworkProfile = {};
        dbModel.SipNetworkProfile.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = list[i].id;

                    if (key)
                    {
                        obj.SipNetworkProfile[key] = list[i];
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

var AddUsersWithGroupIds = function(companyId, tenantId, user)
{
    try
    {
        dbModel.UserGroup.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}], include:[{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint", where:[{id: user.id}]}]})
            .then(function (list)
            {
                var arr = [];
                for(i=0; i<list.length; i++)
                {
                    arr.push(list[i].id);
                }

                var usrStr = JSON.stringify(user);

                var usrObj = JSON.parse(usrStr);

                usrObj.GroupIDs = arr;
                redisHandler.SetObject('SIPUSERBYID:' + tenantId + ':' + companyId + ':' + usrObj.id, JSON.stringify(usrObj), function(err, res)
                {
                    console.log('SIPUSER BY ID ADDED');
                });

            }).catch(function(err)
            {
                console.log(err);
            });
    }
    catch(ex)
    {
        console.log(ex);

    }



}

var AddUsers = function(companyId, tenantId, obj, callback)
{
    try
    {
        dbModel.SipUACEndpoint.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {

                for (i = 0; i < list.length; i++)
                {
                    AddUsersWithGroupIds(companyId, tenantId, list[i], function(ee)
                    {

                    });
                    redisHandler.SetObject('SIPUSER:' + list[i].SipUsername, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('SIPUSER ADDED');
                    });

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

var AddCloudEndUsers = function(companyId, tenantId, obj, callback)
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

var AddDidNumbers = function(companyId, tenantId, obj, callback)
{
    try
    {
        dbModel.DidNumber.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    redisHandler.SetObject('DIDNUMBER:' + tenantId + ':' + companyId + ':' + list[i].DidNumber, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('DIDNUMBER ADDED');
                    });

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

var AddExtensionWithMappingId = function(companyId, tenantId, extType, ext)
{
    try
    {

        if(extType === 'USER')
        {
            dbModel.Extension.find({where :[{CompanyId: companyId},{TenantId: tenantId},{Extension: ext.Extension}], include:[{model: dbModel.SipUACEndpoint, as: "SipUACEndpoint"}]})
                .then(function (extension)
                {
                    if(extension && extension.SipUACEndpoint)
                    {
                        var extStr = JSON.stringify(ext);

                        var extObj = JSON.parse(extStr);

                        extObj.MappingID = extension.SipUACEndpoint.id;

                    }

                    redisHandler.SetObject('EXTENSION:' + tenantId + ':' + companyId + ':' + extension.Extension, JSON.stringify(extObj), function(err, res)
                    {
                        console.log('EXTENSION ADDED');
                    });



                }).catch(function(err)
                {
                    console.log(err);
                });
        }
        else if(extType === 'GROUP')
        {
            dbModel.Extension.find({where :[{CompanyId: companyId},{TenantId: tenantId},{Extension: ext.Extension}], include:[{model: dbModel.UserGroup, as: "UserGroup"}]})
                .then(function (extension)
                {
                    if(extension && extension.UserGroup)
                    {
                        var extStr = JSON.stringify(ext);

                        var extObj = JSON.parse(extStr);

                        extObj.MappingID = extension.UserGroup.id;

                    }

                    redisHandler.SetObject('EXTENSION:' + tenantId + ':' + companyId + ':' + extension.Extension, JSON.stringify(extObj), function(err, res)
                    {
                        console.log('EXTENSION ADDED');
                    });



                }).catch(function(err)
                {
                    console.log(err);
                });

        }
        else
        {
            redisHandler.SetObject('EXTENSION:' + tenantId + ':' + companyId + ':' + ext.Extension, JSON.stringify(ext), function(err, res)
            {
                console.log('EXTENSION ADDED');
            });
        }


    }
    catch(ex)
    {
        console.log(ex);

    }



}

var AddExtensions = function(companyId, tenantId, obj, callback)
{
    try
    {
        dbModel.Extension.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    AddExtensionWithMappingId(companyId, tenantId, list[i].ObjCategory, list[i], function(ee)
                    {

                    });
                    redisHandler.SetObject('EXTENSIONBYID:' + tenantId + ':' + companyId + ':' + list[i].id, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('EXTENSIONBYID ADDED');
                    });

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
        dbModel.TrunkPhoneNumber.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    redisHandler.SetObject('TRUNKNUMBERBYID:' + tenantId + ':' + companyId + ':' + list[i].id, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('TRUNKNUMBERBYID ADDED');
                    });
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

        dbModel.NumberBlacklist.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = 'NUMBERBLACKLIST:' + tenantId + ':' + companyId + ':' + list[i].PhoneNumber;

                    redisHandler.SetObject(key, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('NUMBERBLACKLIST ADDED');
                    });

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
        dbModel.UserGroup.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var key = 'USERGROUP:' + tenantId + ':' + companyId + ':' + list[i].id;

                    redisHandler.SetObject(key, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('USERGROUP ADDED');
                    });

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
                    var key = 'PBXUSER:' + tenantId + ':' + companyId + ':' + list[i].UserUuid;

                    redisHandler.SetObject(key, JSON.stringify(list[i]), function(err, res)
                    {
                        console.log('PBXUSER ADDED');
                    });

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
    try
    {
        var FeatureCode = {};
        dbModel.FeatureCode.findAll({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (list)
            {
                for (i = 0; i < list.length; i++)
                {
                    var fcId = list[i].id;

                    if(fcId)
                    {
                        FeatureCode[fcId] = list[i];
                    }
                }

                redisHandler.SetObject('FEATURECODE:' + tenantId + ':' + companyId + ':', JSON.stringify(FeatureCode), function(err, res)
                {
                    console.log('PBXUSER ADDED');
                });

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

}

var AddPABXMasterData = function(companyId, tenantId, obj, callback)
{
    try
    {
        obj.PBXMasterData = {};
        dbModel.PBXMasterData.find({where :[{CompanyId: companyId},{TenantId: tenantId}]})
            .then(function (pbxData)
            {
                if(pbxData)
                {
                    redisHandler.SetObject('PBXCOMPANYINFO:' + tenantId + ':' + companyId + ':', JSON.stringify(pbxData), function(err, res)
                    {
                        console.log('PBXUSER ADDED');
                    });
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

}

var CreatePABXObject = function(companyId, tenantId, obj, callback)
{
    AddPBXUsers(companyId, tenantId, obj, function(data)
    {
        AddFeatureCodes(companyId, tenantId, data, function(data)
        {
            AddPABXMasterData(companyId, tenantId, data, function(data)
            {
                callback(data);
            })

        })
    })
};

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
                                                AddCloudEndUsers(companyId, tenantId, data, function(data)
                                                {
                                                    AddCallServers(companyId, tenantId, data, function(data)
                                                    {
                                                        AddSipProfiles(companyId, tenantId, data, function(data)
                                                        {
                                                            AddDidNumbers(companyId, tenantId, data, function(data)
                                                            {
                                                                callback(data);
                                                            });

                                                        })

                                                    });

                                                });

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

var CreateSpecificCompanyData = function(companyId, tenantId, callback)
{
    CreateDataObject(companyId, tenantId, {}, function(obj)
    {
        if(obj)
        {
            redisHandler.SetObject('DVPCACHE:' + tenantId + ':' + companyId, JSON.stringify(obj), function(err, res)
            {
                callback(err, res);
            })
        }
        else
        {
            callback(new Error('Object cannot be created'), false);
        }
    })
}

var CreatePBXSpecificCompanyData = function(companyId, tenantId, callback)
{
    CreatePABXObject(companyId, tenantId, {}, function(obj)
    {
        if(obj)
        {
            redisHandler.SetObject('PBXCACHE:' + tenantId + ':' + companyId, JSON.stringify(obj), function(err, res)
            {
                callback(err, res);
            });
        }
        else
        {
            callback(new Error('Object cannot be created'), false);
        }
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

                    CreatePABXObject(companyId, tenantId, {}, function(obj)
                    {
                        if(obj)
                        {

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
    AddCallServersGlobally();
    AddClusters();
    CreateCompanyData();

};

BuildGlobalData();

//CreateSpecificCompanyData(3,1, function(err, resp)
//{
//    console.log('www');
//})

module.exports.CreateSpecificCompanyData = CreateSpecificCompanyData;
module.exports.CreatePBXSpecificCompanyData = CreatePBXSpecificCompanyData;