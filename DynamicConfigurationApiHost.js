var restify = require('restify');
var fsMediaFormatter = require('./FreeSwitchMediaFormatter.js');
var extBackendHandler = require('./SipExtBackendOperations.js');
var xmlGen = require('./XmlResponseGenerator.js');

var server = restify.createServer({
    name: 'localhost',
    version: '1.0.0',
    formatters : {
        'application/x-www-form-urlencoded' : function(req, res, body)
        {
            return body;
        }
    }
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());


server.post('/DirectoryProfile/', function(req, res, next)
{
    try
    {
        var data = fsMediaFormatter.convertUrlEncoded(req.body);

        var hostname = data["hostname"];
        var username = data["user"];
        var domain = data["domain"];
        var action = data["action"];
        var purpose = data["purpose"];
        var group = data["group"];
        var sipAuthRealm = data["sip_auth_realm"];
        var profile = data["profile"];

        if(action && username && hostname && domain && (action === 'sip_auth' || action === 'message-count'))
        {
            var tempAuthRealm = domain;
            if(sipAuthRealm != undefined)
            {
                tempAuthRealm = sipAuthRealm;
            }

            extBackendHandler.getExtensionBy_Name_Domain(username, tempAuthRealm, function(err, ext){
                if(ext != undefined)
                {
                    //create xml
                    var xml = xmlGen.createDirectoryProfile(ext.ExtensionName, ext.Extension, ext.Domain, ext.EmailAddress, ext.Password, ext.Context);

                    res.end(xml);

                }
                else
                {
                    var xml = xmlGen.createNotFoundResponse();

                    res.end(xml);
                }
            })
        }
        else
        {
            res.end(xmlGen.createNotFoundResponse());
        }
        return next();
    }
    catch(ex)
    {
        res.end(xmlGen.createNotFoundResponse());
    }

    return next();

});


server.listen(9093, 'localhost', function () {
    console.log('%s listening at %s', server.name, server.url);
});