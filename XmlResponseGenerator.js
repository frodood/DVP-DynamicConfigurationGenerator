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

var CreateGatewayProfile = function(gwList)
{
    try
    {
        var expireSec = 60;
        var retrySec = 3600;


        var doc = xmlBuilder.create('document').att('type', 'freeswitch/xml')
            .ele('section').att('name', 'directory');

        gwList.forEach(function(gw)
        {
            var proxy = gw.IpUrl;
            if(gw.Proxy)
            {
                proxy = gw.Proxy;
            }

            doc.ele('domain').att('name', gw.Domain)
                .ele('params')
                    .ele('param').att('name', 'dial-string').att('value', '{presence_id=${dialed_user}${dialed_domain}}${sofia_contact(${dialed_user}${dialed_domain})}')
                    .up()
                .up()
                .ele('variables')
                    .ele('variable')
                    .up()
                .up()
                .ele('user').att('id', '')
                    .ele('gateways')
                        .ele('gateway').att('name', gw.TrunkCode)
                            .ele('param').att('name', 'username').att('value', '')
                            .up()
                            .ele('param').att('name', 'auth-username').att('value', '')
                            .up()
                            .ele('param').att('name', 'realm').att('value', gw.IpUrl)
                            .up()
                            .ele('param').att('name', 'proxy').att('value', proxy)
                            .up()
                            .ele('param').att('name', 'register-proxy').att('value', gw.IpUrl)
                            .up()
                            .ele('param').att('name', 'register-transport').att('value', 'udp')
                            .up()
                            .ele('param').att('name', 'caller-id-in-from').att('value', 'true')
                            .up()
                            .ele('param').att('name', 'password').att('value', '')
                            .up()
                            .ele('param').att('name', 'from-user').att('value', '')
                            .up()
                            .ele('param').att('name', 'from-domain').att('value', gw.Domain)
                            .up()
                            .ele('param').att('name', 'expire-seconds').att('value', expireSec)
                            .up()
                            .ele('param').att('name', 'retry-seconds').att('value', retrySec)
                            .up()
                            .ele('param').att('name', 'context').att('value', 'public')
                            .up()
                            .ele('param').att('name', 'register').att('value', 'false')
                            .up()
                            .ele('param').att('name', 'auth-calls').att('value', 'false')
                            .up()
                            .ele('param').att('name', 'apply-register-acl').att('value', 'provider')
                            .up()
                        .up()
                    .up()
                    .ele('params')
                        .ele('param').att('name', 'password').att('value', '')
                        .up()
                    .up()
                .up()
            .up()


        });

        doc.up()
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
module.exports.CreateGatewayProfile = CreateGatewayProfile;