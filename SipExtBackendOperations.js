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

module.exports.GetUserBy_Name_Domain = GetUserBy_Name_Domain;
module.exports.GetUserBy_Ext_Domain = GetUserBy_Ext_Domain;

