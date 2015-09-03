module.exports = {
  "DB": {
    "Type":"postgres",
    "User":"duo",
    "Password":"DuoS123",
    "Port":5432,
    "Host":"127.0.0.1",
    "Database":"dvpdb"
  },
  "Redis": {
    "IpAddress":"127.0.0.1",
    "Port":"6379"
  },

  "Host":{
    "Ip":"0.0.0.0",
    "Port":9098,
    "Version":"1.0.0.0"
  },

  "Services": {
    "HttApiUrl":"http://192.168.2.33/hhhdsjf",
    "SipUACApi":
    {
      "Ip":"127.0.0.1",
      "Port":"9093",
      "Version":"1.0.0.0"
    },
    "fileServiceHost": "192.168.0.54",
    "fileServicePort": 8081,
    "fileServiceVersion":"6.0"

  }
};