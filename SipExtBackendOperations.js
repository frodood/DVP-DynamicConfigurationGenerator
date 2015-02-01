var dbModel = require('./DVP-DBModels');

var getExtensionBy_Name_Domain = function(extName, domain, callback)
{
    try {
        dbModel.Extension
            .find({where: {ExtensionName: extName} && {Domain: domain}})
            .complete(function (err, ext) {

                try {
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
                    console.log(ex.toString());
                    callback(undefined, undefined);
                }

            })

        }
    catch(ex)
    {
        console.log(ex.toString());
    }


};

module.exports.getExtensionBy_Name_Domain = getExtensionBy_Name_Domain;

