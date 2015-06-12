var underscore = require('underscore');
var xmlBuilder = require('./XmlExtendedDialplanBuilder.js');
var xBuilder = require('./XmlResponseGenerator.js');

var CreateConferenceEndpointList = function(reqId, context, companyId, tenantId, dialOutUsers, confExt, callback)
{
    var epList = [];
    try
    {
        var len = dialOutUsers.length;
        var count = 0;

        if(dialOutUsers)
        {
            dialOutUsers.forEach(function(dOutUsr)
            {
                if(count < len)
                {
                    if (dOutUsr.ObjCategory === 'External')
                    {
                        //pick outbound rule with destination as dnis
                        ruleBackendHandler.PickCallRuleOutboundComplete('', dOutUsr.Destination, '', context, companyId, tenantId, false, function (err, rule) {
                            if (!err && rule)
                            {
                                var ep =
                                {
                                    Profile: rule.GatewayCode,
                                    Type: 'GATEWAY',
                                    LegStartDelay: 0,
                                    BypassMedia: false,
                                    LegTimeout: rule.Timeout,
                                    Destination: rule.DNIS,
                                    Domain: rule.Domain,
                                    Origination: rule.ANI,
                                    OriginationCallerIdNumber: rule.ANI
                                };


                                epList.push(ep);

                                count++;

                                if (count >= len)
                                {
                                    callback(undefined, epList);
                                }
                            }
                        })

                        //create ep add to ep arr
                    }
                    else
                    {
                        //pick user
                        if (dOutUsr.SipUACEndpoint && dOutUsr.SipUACEndpoint.CloudEndUser)
                        {
                            var ep =
                            {
                                Profile: '',
                                Type: 'USER',
                                LegStartDelay: 0,
                                BypassMedia: false,
                                LegTimeout: 60,
                                Origination: confExt,
                                OriginationCallerIdNumber: confExt,
                                Destination: dOutUsr.SipUACEndpoint.SipExtension,
                                Domain: dOutUsr.SipUACEndpoint.CloudEndUser.Domain
                            };

                            epList.push(ep);

                            count++;

                            if (count >= len)
                            {
                                callback(undefined, epList);
                            }
                        }

                        //create ep add to ep arr
                    }
                }
                else
                {
                    callback(undefined, epList);
                }
            })
        }
        else
        {
            callback(undefined, epList);
        }

    }
    catch(ex)
    {
        callback(ex, epList);
    }
};


var ConferenceHandlerOperation = function(reqId, ext, direction, fromUserUuid, context, profile, companyId, tenantId, callback)
{
    try
    {
        if(ext.Conference)
        {
            var curTime = new Date();

            if(ext.Conference.StartDate <= curTime && ext.Conference.EndDate >= curTime)
            {
                var maxUsers = 0;
                var currUsers = 0;
                var allowAnonymous = false;
                var conferenceName = '';
                var conferenceDomain = '';
                var pin = '';
                var mode = '';

                if(ext.Conference.MaxUser)
                {
                    maxUsers = ext.ConferenceName.MaxUser;
                }

                if(ext.Conference.CurrentUsers)
                {
                    currUsers = ext.ConferenceName.CurrentUsers;
                }

                var allowedCount = maxUsers - currUsers;

                if(allowedCount > 0)
                {
                    if(ext.Conference.AllowAnonymousUser)
                    {
                        allowAnonymous = true;
                    }
                    if(ext.Conference.ConferenceName)
                    {
                        conferenceName = ext.Conference.ConferenceName;
                    }

                    if(ext.Conference.CloudEndUser && ext.Conference.CloudEndUser.Domain)
                    {
                        conferenceDomain = ext.Conference.CloudEndUser.Domain;
                    }

                    if(ext.Conference.Pin)
                    {
                        pin = ext.Conference.Pin;
                    }

                    var isFirst = true;

                    if(ext.Conference.Def)
                    {
                        mode = 'deaf';
                        isFirst = false;
                    }

                    if(direction === 'IN')
                    {
                        if(allowAnonymous)
                        {
                            var emptyArr = [];
                             //normal conference dialplan
                            var xml = xmlBuilder.CreateConferenceDialplan(reqId, emptyArr, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, '');

                            callback(undefined, xml);

                        }
                        else
                        {
                            //dont allow
                            callback(new Error('Anonymous users not allowed'), xBuilder.createNotFoundResponse());
                        }
                    }
                    else
                    {
                        if(ext.Conference.ConferenceUser && ext.ConferenceUser.length > 0)
                        {
                            var usr = underscore.find(ext.Conference.ConferenceUser, function(confUser){return confUser.SipUACEndpoint.UserUuid === fromUserUuid});

                            if(usr)
                            {
                                //allowed user

                                var dialOutUsers = underscore.filter(ext.Conference.ConferenceUser, function(usr){return usr.JoinType === 'Out' && usr.UserStatus != 'JOINED'});

                                var epList = CreateConferenceEndpointList(reqId, context, companyId, tenantId, dialOutUsers, ext.Extension);

                                var xml = xmlBuilder.CreateConferenceDialplan(reqId, epList, context, '[^\\s]*', false, conferenceName, conferenceDomain, pin, '');

                                callback(undefined, xml);



                            }
                            else
                            {
                                if(allowAnonymous)
                                {

                                }
                            }
                        }
                        else
                        {
                            if(allowAnonymous)
                            {

                            }
                        }

                    }
                }
                else
                {
                    //dont allow
                }




            }
            //check conference has started or not
            //check conference limit




        }

    }
    catch(ex)
    {

    }
}