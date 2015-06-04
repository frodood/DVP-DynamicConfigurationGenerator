var xmlBuilder = require('xmlbuilder');
var Config = require('config');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;

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
        return createNotFoundResponse();
    }

}

var CreateUserGroupDirectoryProfile = function(grp, reqId)
{
    try
    {
        var grpDomain = grp.Domain ? grp.Domain : "";
        //var element = new xmlBuilder.create('users');
        var obj = {
            'users': []
        };

        if(grp.SipUACEndpoint)
        {
            grp.SipUACEndpoint.forEach(function(sipUsr)
            {

                var sipUsername = sipUsr.SipUsername ? sipUsr.SipUsername : "";
                var sipExt = sipUsr.SipExtension ? sipUsr.SipExtension : "";
                var sipPassword = sipUsr.Password ? sipUsr.Password : "";
                var sipUsrDomain = "";

                if(sipUsr.CloudEndUser && sipUsr.CloudEndUser.Domain)
                {
                    sipUsrDomain = sipUsr.CloudEndUser.Domain;
                }

                var sipUserContext = sipUsr.CountextId ? sipUsr.CountextId : "";

                var userObj = {
                    user:
                    {
                        '@id': sipUsername, '@cacheable': 'false', '@number-alias': sipExt,
                        params: {
                            param: {'@name' : 'dial-string', '@value' : '{sip_invite_domain=${domain_name},presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(${dialed_user}@${dialed_domain})}'},
                            param: {'@name' : 'password', '@value' : sipPassword}
                        },
                        variables: {
                            variable: {'@name' : 'domain', '@value' : sipUsrDomain},
                            variable: {'@name' : 'user_context', '@value' : sipUserContext},
                            variable: {'@name' : 'user_id', '@value' : sipUsername}

                        }
                    }
                };

                obj.users.push(userObj);




            });
        }

        var grpExt = "";
        if(grp.Extension && grp.Extension.Extension)
        {
            grpExt = grp.Extension.Extension;
        }

        var obj2 = {
            'groups': {
                group : {'@name' : grpExt, 'users' : []}
            }
        };


        if(grp.SipUACEndpoint)
        {

            grp.SipUACEndpoint.forEach(function (sipUsr)
            {
                var sipExt = sipUsr.SipExtension ? sipUsr.SipExtension : "";
                var usrPointerObj = {user: {'@id': sipExt, '@type': 'pointer'}};
                obj2.groups.group.users.push(usrPointerObj);

            });
        }

        var doc = xmlBuilder.create('document').att('type', 'freeswitch/xml')
            doc.ele('section').att('name', 'directory')
                .ele('domain').att('name', grpDomain)
                    .ele(obj)
                    .up()
                    .ele(obj2).up().up();

        doc.end({pretty: true});

        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateUserGroupDirectoryProfile] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }



}

var CreateGatewayProfile = function(gwList, reqId)
{
    try
    {
        var expireSec = 60;
        var retrySec = 3600;


        var doc = xmlBuilder.create('document').att('type', 'freeswitch/xml');
        var section = doc.ele('section').att('name', 'directory');

        //var obj = {
        //    'section': []
        //    }

        //obj.section.push()




        gwList.forEach(function(gw)
        {

            var proxy = gw.IpUrl;
            if(gw.Proxy)
            {
                proxy = gw.Proxy;
            }

            section.ele('domain').att('name', gw.Domain)
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

        //var gwStr = section.end({pretty: true});

        return section.end({pretty: true});
    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateGatewayProfile] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }



}

var createDirectoryProfile = function(extName, ext, domain, email, password, context, reqId)
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
        logger.error('[DVP-DynamicConfigurationGenerator.createDirectoryProfile] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateHttpApiDialplan = function(destinationPattern, context, httApiUrl, reqId)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        //var httpUrl = Config.Services.HttApiUrl;

        var httpApiUrl = "{url=" + httApiUrl + "}";

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
                .ele('context').att('name', context)
                    .ele('extension').att('name', 'test')
                        .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
                            .ele('action').att('application', 'answer')
                            .up()
                            .ele('action').att('application', 'httapi').att('value', httpApiUrl)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateHttpApiDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateSocketApiDialplan = function(destinationPattern, context, socketUrl, reqId)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'answer')
            .up()
            .ele('action').att('application', 'socket').att('data', socketUrl + ' async full')
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSocketApiDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateRouteGatewayDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia)
{
    try {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia) {
            ignoreEarlyM = "ignore_early_media=true";
        }

        var doc = xmlBuilder.create('document');

        var cond = doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)

        cond.ele('action').att('application', 'set').att('data', 'ringback=${us-ring}')
            .up()
            .ele('action').att('application', 'set').att('data', 'continue_on_fail=true')
            .up()
            .ele('action').att('application', 'set').att('data', 'hangup_after_bridge=true')
            .up()
            .ele('action').att('application', 'set').att('data', ignoreEarlyM)
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '3 ab s execute_extension::att_xfer XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '4 ab s execute_extension::att_xfer_group XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '6 ab s execute_extension::att_xfer_outbound XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '5 ab s execute_extension::att_xfer_conference XML PBXFeatures')
            .up()


        var option = '';
        var bypassMed = 'bypass_media=false';

        var destinationGroup = util.format('gateway/%s', ep.Profile);

        if (ep.LegStartDelay > 0)
            option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.IpUrl);
        else
            option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.IpUrl);


        var dnis = '';

        if (ep.Domain) {
            dnis = util.format('%s@%s', ep.Destination, ep.Domain);
        }

        var protocol = 'sofia';
        var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

        cond.ele('action').att('application', 'set').att('data', bypassMed)
            .up()
        ele('action').att('application', 'set').att('data', calling)
            .up()

        return cond.end({pretty: true});


    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

module.exports.createDirectoryProfile = createDirectoryProfile;
module.exports.createNotFoundResponse = createNotFoundResponse;
module.exports.CreateGatewayProfile = CreateGatewayProfile;
module.exports.CreateHttpApiDialplan = CreateHttpApiDialplan;
module.exports.CreateUserGroupDirectoryProfile = CreateUserGroupDirectoryProfile;
module.exports.CreateSocketApiDialplan = CreateSocketApiDialplan;
module.exports.CreateRouteGatewayDialplan = CreateRouteGatewayDialplan;