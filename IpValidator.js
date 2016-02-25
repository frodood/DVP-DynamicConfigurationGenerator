/**
 * Created by dinusha on 2/18/2016.
 */

var ip = require('ip');

var ValidateRange = function(ipToValidate, ipRangeListWithSubnet)
{
    for (i = 0; i < ipRangeListWithSubnet.length; i++)
    {
        if(ipRangeListWithSubnet[i].IpAddress && ipRangeListWithSubnet[i].Mask)
        {
            var ipRange = ipRangeListWithSubnet[i].IpAddress + '/' + ipRangeListWithSubnet[i].Mask;

            if(ip.cidrSubnet(ipRange).contains(ipToValidate))
            {
                return true;
            }
        }

    }
    return false;
};

module.exports.ValidateRange = ValidateRange;
