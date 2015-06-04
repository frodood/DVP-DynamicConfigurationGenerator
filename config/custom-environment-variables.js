/**
 * Created by dinusha on 4/22/2015.
 */

module.exports = {

    "DB": {
        "Type":"DB_TYPE",
        "User":"DB_USER",
        "Password":"DB_PASSWORD",
        "Port":"DB_PORT",
        "Host":"DB_HOST",
        "Database":"DB_BASE"
    },

    "Redis":
    {
        "IpAddress": "REDIS_IP",
        "Port": "REDIS_PORT"

    },

    "Host":{
        "Ip":"HOST_IP",
        "Port":"HOST_PORT",
        "Version":"HOST_VERSION"
    },

    "Services": {
        "HttApiUrl":"SYS_SERVICE_HTTPROGRAMMING",
        "SipUACApi":
        {
            "Ip":"SYS_SERVICE_SIPUACENDPOINT_IP",
            "Port":"SYS_SERVICE_SIPUACENDPOINT_PORT",
            "Version":"SYS_SERVICE_SIPUACENDPOINT_VERSION"
        }
    }
};