/**
 * Created by dinusha on 2/18/2016.
 */

var ip = require('ip');
var validator = require('validator');

var ValidateRange = function(ipToValidate, ipRangeListWithSubnet)
{
    for (i = 0; i < ipRangeListWithSubnet.length; i++)
    {
        if(validator.isIP(ipToValidate))
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
        else
        {
            if(ipToValidate === ipRangeListWithSubnet[i].IpAddress)
            {
                return true;
            }
        }


    }
    return false;
};

module.exports.ValidateRange = ValidateRange;
