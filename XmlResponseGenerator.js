var xmlBuilder = require('xmlbuilder');

var createNotFoundResponse = function()
{
    try
    {
        var doc = xmlBuilder.create('document');
        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'result')
                .ele('result').att('status', 'not found')
                .up()
            .up()
        .end({pretty: true});

        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});
    }
    catch(ex)
    {
        return "";
    }

}

var createDirectoryProfile = function(extName, ext, domain, email, password, context)
{
    try {

        if (!extName) {
            extName = "";
        }
        if (!ext) {
            ext = "";
        }
        if (!domain) {
            domain = "";
        }
        if (!email) {
            email = "";
        }
        if (!password) {
            password = "";
        }
        if (!context) {
            context = "";
        }

        var doc = xmlBuilder.create('document');
        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'directory')
                .ele('domain').att('name', domain)
                    .ele('user').att('id', extName).att('cacheable', 'false').att('number-alias', ext)
                        .ele('params')
                            .ele('param').att('name', 'dial-string').att('value', '{sip_invite_domain=${domain_name},presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(${dialed_user}@${dialed_domain})}')
                            .up()
                            .ele('param').att('name', 'password').att('value', password)
                            .up()
                            .ele('param').att('name', 'vm-email-all-messages').att('value', 'true')
                            .up()
                            .ele('param').att('name', 'vm-attach-file').att('value', 'true')
                            .up()
                            .ele('param').att('name', 'vm-mailto').att('value', email)
                            .up()
                        .up()
                    .ele('variables')
                        .ele('variable').att('name', 'domain').att('value', domain)
                        .up()
                        .ele('param').att('name', 'user_context').att('value', context)
                        .up()
                        .ele('param').att('name', 'user_id').att('value', extName)
                        .up()
                    .up()
                .up()
            .up()
        .up()
        .end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});
    }
    catch(ex)
    {
        return "";
    }

};

module.exports.createDirectoryProfile = createDirectoryProfile;
module.exports.createNotFoundResponse = createNotFoundResponse;