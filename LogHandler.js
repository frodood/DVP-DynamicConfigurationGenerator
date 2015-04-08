var winston = require('winston');

var filenameTemp = __dirname + "\\DynamicConfigGeneratorLog.log";

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug' })
    ]
});

var WriteLog = function(level, message)
{
    logger.log(level, message);
};



module.exports.WriteLog = WriteLog;