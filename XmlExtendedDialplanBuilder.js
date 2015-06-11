var xmlBuilder = require('xmlbuilder');
var config = require('config');
var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;
var util = require('util');
var redisHandler = require('./RedisHandler.js');

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

var CreateSendBusyMessageDialplan = function(reqId, destinationPattern, context)
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

        doc.att('type', 'freeswitch/xml')
            .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
            .ele('context').att('name', context)
            .ele('extension').att('name', 'test')
            .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
            .ele('action').att('application', 'answer')
            .up()
            .ele('action').att('application', 'hangup').att('data', 'USER_BUSY')
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
        return createNotFoundResponse();
    }

};

var CreateRouteUserDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia)
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

        var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

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
            .ele('action').att('application', 'bridge').att('data', calling)
            .up()
            .ele('action').att('application', 'answer')
            .up()

        if(ep.PersonalGreeting)
        {
            var greetingPath = 'sounds/' + ep.PersonalGreeting;
            cond.ele('action').att('application', 'playback').att('data', greetingPath)
                .up()
        }



        if(ep.IsVoicemailEnabled)
        {
            cond.ele('action').att('application', 'voicemail').att('data', 'default %s %s', ep.Domain, ep.Destination)
                .up()
        }

        cond.end({pretty: true});


        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n" + doc.toString({pretty: true});




            /*doc.att('type', 'freeswitch/xml')
                .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
                .ele('context').att('name', context)
                .ele('extension').att('name', 'test')
                .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
                .ele('action').att('application', 'set').att('data', 'ringback=${us-ring}')
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
                .ele('action').att('application', 'bridge').att('data', calling)
                .up()
                .ele('action').att('application', 'answer')
                .up()
                .ele('action').att('application', 'voicemail').att('data', 'default %s %s', ep.Domain, ep.Destination)
                .up()
                .up()
                .up()
                .up()
                .up()*/





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

var CreateRouteFaxUserDialplan = function(reqId, ep, context, profile, destinationPattern, ignoreEarlyMedia, fromFaxType, toFaxType)
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


        var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

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
            .ele('action').att('application', 'bridge').att('data', calling)
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

var CreateForwardingDialplan = function(reqId, endpoint, context, profile, destinationPattern, ignoreEarlyMedia, fwdKey)
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

        var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

        if (endpoint.Group)
        {
            calling = util.format("%s,pickup/%s", calling, endpoint.Group);
        }

        var luaParams = util.format('CF.lua ${{originate_disposition}} \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\' \'%s\'', endpoint.CompanyId, endpoint.TenantId, context, endpoint.Domain, endpoint.Origination, endpoint.OriginationCallerIdNumber, fwdKey, endpoint.DodNumber, endpoint.DodActive);


            var doc = xmlBuilder.create('document');

            doc.att('type', 'freeswitch/xml')
                .ele('section').att('name', 'dialplan').att('description', 'RE Dial Plan For FreeSwitch')
                .ele('context').att('name', context)
                .ele('extension').att('name', 'test')
                .ele('condition').att('field', 'destination_number').att('expression', destinationPattern)
                .ele('action').att('application', 'set').att('data', 'ringback=${us-ring}')
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
                .ele('action').att('application', 'bridge').att('data', calling)
                .up()
                .ele('action').att('application', 'lua').att('data', luaParams)
                .up()
                .ele('action').att('application', 'hangup')
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
        logger.error('[DVP-DynamicConfigurationGenerator.CreateSendBusyMessageDialplan] - [%s] - Exception occurred creating xml', reqId, ex);
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

var CreateFollowMeDialplan = function(reqId, fmEndpoints, context, profile, destinationPattern, ignoreEarlyMedia)
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

        fmEndpoints.forEach(function(ep)
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
            var calling = util.format('%s%s/%s/%s', option, protocol, destinationGroup, dnis);

            cond.ele('action').att('application', 'set').att('data', bypassMed)
                .up()
                ele('action').att('application', 'set').att('data', calling)
                .up()

        });

        return cond.end({pretty: true});



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