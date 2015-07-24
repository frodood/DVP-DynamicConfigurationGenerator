var xmlBuilder = require('xmlbuilder');
var config = require('config');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;
var util = require('util');

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

};

var CreateSendBusyMessageDialplan = function(reqId, destinationPattern, context, numLimitInfo)
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

        var doc = xmlBuilder.create('document');

        var cond = doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)

        if(numLimitInfo && numLimitInfo.CheckLimit)
        {
            if(numLimitInfo.NumType === 'INBOUND')
            {
                var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                cond.ele('action').att('application', 'limit').att('data', limitStr)
                    .up()
            }
            else if(numLimitInfo.NumType === 'BOTH')
            {
                if(numLimitInfo.InboundLimit)
                {
                    var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }

                if(numLimitInfo.BothLimit)
                {
                    var limitStr = util.format('hash %d_%d_both %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.BothLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
            }

        }

        cond.ele('action').att('application', 'answer')
            .up()
            .ele('action').att('application', 'hangup').att('data', 'USER_BUSY')
            .up()

            .end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});


    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateConferenceDialplan = function(reqId, epList, context, destinationPattern, ignoreEarlyMedia, confName, domain, pin, mode)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
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

        if(epList)
        {
            epList.forEach(function(ep)
            {
                var option = '';
                var destinationGroup = '';
                var bypassMed = 'bypass_media=false';


                if(ep.Type === 'GATEWAY')
                {
                    destinationGroup = util.format('gateway/%s', ep.Profile);

                    if (ep.LegStartDelay > 0)
                        option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.IpUrl);
                    else
                        option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.IpUrl);

                    bypassMed = 'bypass_media=false';
                }
                else
                {
                    destinationGroup = 'user';

                    if (ep.LegStartDelay > 0)
                        option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);
                    else
                        option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);

                    if(ep.BypassMedia)
                    {
                        bypassMed = 'bypass_media=true';
                    }
                    else
                    {
                        bypassMed = 'bypass_media=false';
                    }

                }

                var dnis = '';

                if (domain)
                {
                    dnis = util.format('%s@%s', ep.Destination, ep.Domain);
                }

                var protocol = 'sofia';
                var calling = '';

                if(ep.Type === 'GATEWAY')
                {
                    calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);
                }
                else
                {
                    calling = util.format('%s%s/%s', option, destinationGroup, dnis);
                }


                cond.ele('action').att('application', 'conference_set_auto_outcall').att('data', calling)
                    .up()

            });
        }

        if(mode)
        {
            var confStr = confName + '@' + domain + '+' + pin + '+flags{' + mode + '}';
            cond.ele('action').att('application', 'conference').att('data', confStr)
                .up()
        }
        else
        {
            var confStr = confName + '@' + domain + '+' + pin;
            cond.ele('action').att('application', 'conference').att('data', confStr)
                .up()
        }

        if(epList && epList.length > 0)
        {
            cond.ele('action').att('application', 'set').att('data', 'conference_auto_outcall_timeout=20')
                .up()
                .ele('action').att('application', 'set').att('data', 'conference_auto_outcall_flags=none')
                .up()
                .ele('action').att('application', 'set').att('data', 'conference_auto_outcall_profile=default')
                .up()
        }

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});



    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateRouteUserDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia, numLimitInfo)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var bypassMedia = "bypass_media=true";
        if (!ep.BypassMedia)
        {
            bypassMedia = "bypass_media=false";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
            ignoreEarlyM = "ignore_early_media=true";
        }

        var option = '';

        if (ep.LegStartDelay > 0)
            option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);
        else
            option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);

        //var httpUrl = Config.Services.HttApiUrl;

        var dnis = ep.Destination;

        if (ep.Domain)
        {
            dnis = util.format('%s@%s', dnis, ep.Domain);
        }
        var protocol = 'sofia';
        var destinationGroup = 'user';

        if(ep.Type === 'GROUP')
        {
            destinationGroup = 'group';
        }

        var calling = util.format('%s%s/%s', option, destinationGroup, dnis);

        if(ep.Type === 'USER')
        {
            if (ep.Group)
            {
                calling = util.format("%s,pickup/%s", calling, ep.Group);
            }
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
            .ele('action').att('application', 'set').att('data', bypassMedia)
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '3 ab s execute_extension::att_xfer XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '4 ab s execute_extension::att_xfer_group XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '6 ab s execute_extension::att_xfer_outbound XML PBXFeatures')
            .up()
            .ele('action').att('application', 'bind_meta_app').att('data', '5 ab s execute_extension::att_xfer_conference XML PBXFeatures')
            .up()


        if(numLimitInfo && numLimitInfo.CheckLimit)
        {
            if(numLimitInfo.NumType === 'INBOUND')
            {
                var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                cond.ele('action').att('application', 'limit').att('data', limitStr)
                    .up()
            }
            else if(numLimitInfo.NumType === 'BOTH')
            {
                if(numLimitInfo.InboundLimit)
                {
                    var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }

                if(numLimitInfo.BothLimit)
                {
                    var limitStr = util.format('hash %d_%d_both %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.BothLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
            }

        }


        if(ep.PersonalGreeting)
        {
            var personalGreetingExportVar = util.format('nolocal:api_on_answer=uuid_broadcast ${uuid} %s both', ep.PersonalGreeting);
            cond.ele('action').att('application', 'export').att('data', personalGreetingExportVar)
            .up()
            //var greetingPath = 'sounds/' + ep.PersonalGreeting;
            //.ele('action').att('application', 'playback').att('data', greetingPath)
            //    .up()
        }

        cond.ele('action').att('application', 'bridge').att('data', calling)
            .up()



        if(ep.IsVoicemailEnabled)
        {
            cond.ele('action').att('application', 'answer')
                .up()

            cond.ele('action').att('application', 'voicemail').att('data', util.format('default %s %s', ep.Domain, ep.Destination))
                .up()
        }

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});



    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateRouteFaxGatewayDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia, fromFaxType, toFaxType)
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

        if(fromFaxType === 'T38' && toFaxType === 'AUDIO')
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
        }
        else if(fromFaxType === 'AUDIO' && toFaxType === 'T38')
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
        }
        else if(fromFaxType === 'T30AUDIO' && toFaxType === 'T38')
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway peer nocng')
                .up()
        }
        else if(fromFaxType === 'T38' && toFaxType === 'T38')
        {
            cond.ele('action').att('application', 'set').att('data', 't38_passthru=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'refuse_t38=true')
                .up()
        }
        else if(fromFaxType === 'T38PASSTHRU' && toFaxType === 'T38PASSTHRU')
        {
            cond.ele('action').att('application', 'export').att('data', 'refuse_t38=true')
                .up()
        }
        else
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
        }

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

var CreateRouteFaxUserDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia, fromFaxType, toFaxType, numLimitInfo)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
            ignoreEarlyM = "ignore_early_media=true";
        }

        var option = '';

        if (ep.LegStartDelay > 0)
            option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);
        else
            option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);

        //var httpUrl = Config.Services.HttApiUrl;

        var dnis = ep.Destination;

        if (ep.Domain)
        {
            dnis = util.format('%s@%s', dnis, ep.Domain);
        }
        var protocol = 'sofia';
        var destinationGroup = 'user';


        var calling = util.format('%s%s/%s', option, protocol, destinationGroup, dnis);

        if(ep.Type === 'USER')
        {
            if (ep.Group)
            {
                calling = util.format("%s,pickup/%s", calling, ep.Group);
            }
        }


        var doc = xmlBuilder.create('document');

        var cond = doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)

        if(fromFaxType === 'AUDIO' && toFaxType === 'T38')
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
        }
        else if(fromFaxType === 'T38' && toFaxType === 'AUDIO')
        {
            cond.ele('action').att('application', 'set').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
                .ele('action').att('application', 'export').att('data', 'refuse_t38=true')
                .up()
        }
        else if(fromFaxType === 'T38' && toFaxType === 'T30AUDIO')
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway peer nocng')
                .up()
        }
        else if(fromFaxType === 'T38' && toFaxType === 'T38')
        {
            cond.ele('action').att('application', 'set').att('data', 't38_passthru=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'refuse_t38=true')
                .up()
        }
        else if(fromFaxType === 'T38PASSTHRU' && toFaxType === 'T38PASSTHRU')
        {
            cond.ele('action').att('application', 'set').att('data', 't38_passthru=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'refuse_t38=true')
                .up()
        }
        else
        {
            cond.ele('action').att('application', 'set').att('data', 'fax_enable_t38=true')
                .up()
                .ele('action').att('application', 'export').att('data', 'sip_execute_on_image=t38_gateway self nocng')
                .up()
        }



        cond.ele('action').att('application', 'set').att('data', 'continue_on_fail=true')
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

        if(numLimitInfo && numLimitInfo.CheckLimit)
        {
            if(numLimitInfo.NumType === 'INBOUND')
            {
                var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                cond.ele('action').att('application', 'limit').att('data', limitStr)
                    .up()
            }
            else if(numLimitInfo.NumType === 'BOTH')
            {
                if(numLimitInfo.InboundLimit)
                {
                    var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }

                if(numLimitInfo.BothLimit)
                {
                    var limitStr = util.format('hash %d_%d_both %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.BothLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
            }

        }
            cond.ele('action').att('application', 'bridge').att('data', calling)
            .up()

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreatePickUpDialplan = function(reqId, extension, context, destinationPattern)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'pickup').att('data', extension)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreatePickUpDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateVoicemailDialplan = function(reqId, extension, context, destinationPattern, domain)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var voicemailStr = 'check auth default ' + domain + ' ' + extension;

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'answer')
            .up()
            .ele('action').att('application', 'set').att('data', 'voicemail_authorized=${sip_authorized}')
            .up()
            .ele('action').att('application', 'voicemail').att('data', voicemailStr)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateVoicemailDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateInterceptDialplan = function(reqId, uuid, context, destinationPattern)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'set').att('data', 'intercept_unanswered_only=true')
            .up()
            .ele('action').att('application', 'intercept').att('data', uuid)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateInterceptDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateParkDialplan = function(reqId, extension, context, destinationPattern, parkId)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var parkStr = context + ' ' + parkId;

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'answer')
            .up()
            .ele('action').att('application', 'valet_park').att('data', parkStr)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateParkDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateBargeDialplan = function(reqId, uuid, context, destinationPattern, caller)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var dtmfString = "w1@500";
        if (!caller)
        {
            dtmfString = "w2@500";
        }

        var doc = xmlBuilder.create('document');

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'set').att('data', 'eavesdrop_enable_dtmf=true')
            .up()
            .ele('action').att('application', 'queue_dtmf').att('data', dtmfString)
            .up()
            .ele('action').att('application', 'eavesdrop').att('data', uuid)
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateBargeDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateForwardingDialplan = function(reqId, endpoint, context, profile, destinationPattern, ignoreEarlyMedia, fwdKey, numLimitInfo)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var bypassMedia = "bypass_media=true";
        if (!endpoint.BypassMedia)
        {
            bypassMedia = "bypass_media=false";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
            ignoreEarlyM = "ignore_early_media=true";
        }

        var option = '';

        if (endpoint.LegStartDelay > 0)
            option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', endpoint.LegStartDelay, endpoint.LegTimeout, endpoint.Origination, endpoint.OriginationCallerIdNumber);
        else
            option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', endpoint.LegTimeout, endpoint.Origination, endpoint.OriginationCallerIdNumber);

        //var httpUrl = Config.Services.HttApiUrl;

        var dnis = endpoint.Destination;

        if (endpoint.Domain)
        {
            dnis = util.format('%s@%s', dnis, endpoint.Domain);
        }
        var protocol = 'sofia';
        var destinationGroup = 'user';

        var calling = util.format('%s%s/%s', option, destinationGroup, dnis);

        if (endpoint.Group)
        {
            calling = util.format("%s,pickup/%s", calling, endpoint.Group);
        }

        if(!endpoint.DodNumber)
        {
            endpoint.DodNumber = '';
        }

        var luaParams = util.format('CF.lua ${originate_disposition} \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\'', endpoint.CompanyId, endpoint.TenantId, context, endpoint.Domain, endpoint.Origination, endpoint.OriginationCallerIdNumber, fwdKey, endpoint.DodNumber);


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
                .ele('action').att('application', 'set').att('data', bypassMedia)
                .up()
                .ele('action').att('application', 'bind_meta_app').att('data', '3 ab s execute_extension::att_xfer XML PBXFeatures')
                .up()
                .ele('action').att('application', 'bind_meta_app').att('data', '4 ab s execute_extension::att_xfer_group XML PBXFeatures')
                .up()
                .ele('action').att('application', 'bind_meta_app').att('data', '6 ab s execute_extension::att_xfer_outbound XML PBXFeatures')
                .up()
                .ele('action').att('application', 'bind_meta_app').att('data', '5 ab s execute_extension::att_xfer_conference XML PBXFeatures')
                .up()

        if(numLimitInfo && numLimitInfo.CheckLimit)
        {
            if(numLimitInfo.NumType === 'INBOUND')
            {
                var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                cond.ele('action').att('application', 'limit').att('data', limitStr)
                    .up()
            }
            else if(numLimitInfo.NumType === 'BOTH')
            {
                if(numLimitInfo.InboundLimit)
                {
                    var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }

                if(numLimitInfo.BothLimit)
                {
                    var limitStr = util.format('hash %d_%d_both %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.BothLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
            }

        }


            cond.ele('action').att('application', 'bridge').att('data', calling)
                .up()
                .ele('action').att('application', 'lua').att('data', luaParams)
                .up()
                .ele('action').att('application', 'hangup')
                .up()

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});

    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateRouteGatewayDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia)
{
    try
    {
        if (!destinationPattern)
        {
            destinationPattern = "";
        }

        if (!context)
        {
            context = "";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
            ignoreEarlyM = "ignore_early_media=true";
        }

        var bypassMed = 'bypass_media=false';

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
            .ele('action').att('application', 'set').att('data', bypassMed)
            .up()


        var option = '';

        var destinationGroup = util.format('gateway/%s', ep.Profile);

        if (ep.LegStartDelay > 0)
            option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.Domain);
        else
            option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.Domain);


        var dnis = '';

        if (ep.Domain)
        {
            dnis = util.format('%s@%s', ep.Destination, ep.Domain);
        }

        var protocol = 'sofia';
        var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

        if(ep.CheckLimit)
        {
            if(ep.NumberType === 'OUTBOUND')
            {
                //should only have an outbound limit
                if(typeof ep.OutLimit != 'undefined')
                {

                    var limitStr = util.format('hash %d_%d_outbound %s %d !USER_BUSY', ep.TenantId, ep.CompanyId, ep.TrunkNumber, ep.OutLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
                else
                {
                    return createNotFoundResponse();
                }

            }
            else if(ep.NumberType === 'BOTH')
            {
                if(typeof ep.OutLimit != 'undefined' || typeof ep.BothLimit != 'undefined')
                {
                    if(typeof ep.OutLimit != 'undefined')
                    {
                        var limitStr = util.format('hash %d_%d_outbound %s %d !USER_BUSY', ep.TenantId, ep.CompanyId, ep.TrunkNumber, ep.OutLimit);
                        cond.ele('action').att('application', 'limit').att('data', limitStr)
                            .up()
                    }

                    if(typeof ep.BothLimit != 'undefined')
                    {
                        outLim = ep.BothLimit;
                        var limitStr = util.format('hash %d_%d_outbound %s %d !USER_BUSY', ep.TenantId, ep.CompanyId, ep.TrunkNumber, ep.BothLimit);
                        cond.ele('action').att('application', 'limit').att('data', limitStr)
                            .up()
                    }
                }
                else
                {
                    return createNotFoundResponse();
                }


            }
        }

        cond.ele('action').att('application', 'bridge').att('data', calling)
            .up()

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});


    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateFollowMeDialplan = function(reqId, fmEndpoints, context, profile, destinationPattern, ignoreEarlyMedia, numLimitInfo)
{
    try
    {
        if (!destinationPattern) {
            destinationPattern = "";
        }

        if (!context) {
            context = "";
        }

        var ignoreEarlyM = "ignore_early_media=false";
        if (ignoreEarlyMedia)
        {
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

        if(numLimitInfo && numLimitInfo.CheckLimit)
        {
            if(numLimitInfo.NumType === 'INBOUND')
            {
                var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                cond.ele('action').att('application', 'limit').att('data', limitStr)
                    .up()
            }
            else if(numLimitInfo.NumType === 'BOTH')
            {
                if(numLimitInfo.InboundLimit)
                {
                    var limitStr = util.format('hash %d_%d_inbound %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.InboundLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }

                if(numLimitInfo.BothLimit)
                {
                    var limitStr = util.format('hash %d_%d_both %s %d !USER_BUSY', numLimitInfo.TenantId, numLimitInfo.CompanyId, numLimitInfo.TrunkNumber, numLimitInfo.BothLimit);
                    cond.ele('action').att('application', 'limit').att('data', limitStr)
                        .up()
                }
            }

        }



        fmEndpoints.forEach(function(ep)
        {
            var option = '';
            var destinationGroup = '';
            var bypassMed = 'bypass_media=false';


            if(ep.Type === 'GATEWAY')
            {
                destinationGroup = util.format('gateway/%s', ep.Profile);

                if (ep.LegStartDelay > 0)
                    option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.Domain);
                else
                    option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s,sip_h_X-Gateway=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber, ep.Domain);

                bypassMed = 'bypass_media=false';
            }
            else
            {
                destinationGroup = 'user';

                if (ep.LegStartDelay > 0)
                    option = util.format('[leg_delay_start=%d,leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegStartDelay, ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);
                else
                    option = util.format('[leg_timeout=%d,origination_caller_id_name=%s,origination_caller_id_number=%s]', ep.LegTimeout, ep.Origination, ep.OriginationCallerIdNumber);

                if(ep.BypassMedia)
                {
                    bypassMed = 'bypass_media=true';
                }
                else
                {
                    bypassMed = 'bypass_media=false';
                }

            }

            var dnis = '';

            if (ep.Domain)
            {
                dnis = util.format('%s@%s', ep.Destination, ep.Domain);
            }
            else
            {
                dnis = util.format('%s', ep.Destination);
            }

            var protocol = 'sofia';
            var calling = '';

            if(ep.Type === 'GATEWAY')
            {
                calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);
            }
            else
            {
                calling = util.format('%s%s/%s', option, destinationGroup, dnis);
            }


            cond.ele('action').att('application', 'set').att('data', bypassMed)
                .up()
                .ele('action').att('application', 'bridge').att('data', calling)
                .up()

        });

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});



    }
    catch(ex)
    {
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

module.exports.createNotFoundResponse = createNotFoundResponse;
module.exports.CreateSendBusyMessageDialplan = CreateSendBusyMessageDialplan;
module.exports.CreateRouteUserDialplan = CreateRouteUserDialplan;
module.exports.CreateFollowMeDialplan = CreateFollowMeDialplan;
module.exports.CreateForwardingDialplan = CreateForwardingDialplan;
module.exports.CreateRouteGatewayDialplan = CreateRouteGatewayDialplan;
module.exports.CreatePickUpDialplan = CreatePickUpDialplan;
module.exports.CreateInterceptDialplan= CreateInterceptDialplan;
module.exports.CreateBargeDialplan = CreateBargeDialplan;
module.exports.CreateVoicemailDialplan = CreateVoicemailDialplan;
module.exports.CreateParkDialplan = CreateParkDialplan;
module.exports.CreateRouteFaxUserDialplan = CreateRouteFaxUserDialplan;
module.exports.CreateRouteFaxGatewayDialplan = CreateRouteFaxGatewayDialplan;
module.exports.CreateConferenceDialplan = CreateConferenceDialplan;