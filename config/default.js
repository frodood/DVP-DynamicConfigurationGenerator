module.exports = {
  "DB": {
    "Type":"postgres",
    "User":"duo",
    "Password":"DuoS123",
    "Port":5432,
    "Host":"104.236.231.11",
    "Database":"duo"
  },

  "Redis": {
    "IpAddress":"127.0.0.1",
    "Port":"6379",
    "Password": "123"
  },

  "Host":{
    "Ip":"0.0.0.0",
    "Port":8816,
    "Version":"1.0.0.0"
  },

  "Services":
  {

    "fileServiceHost": "192.168.0.54",
    "fileServicePort": 8081,
    "fileServiceVersion":"6.0"

  },

  "Token": "123",
  "UseCache": false
};