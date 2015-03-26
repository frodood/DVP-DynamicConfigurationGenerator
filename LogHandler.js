var winston = require('winston');

var filenameTemp = __dirname + "\\DynamicConfigGeneratorLog.log";
winston.add(winston.transports.File, { filename: filenameTemp });

var WriteLog = function(level, message)
{
    winston.log(level, message);
};

module.exports.WriteLog = WriteLog;