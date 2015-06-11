
var ConferenceHandlerOperation = function(ext, direction, fromUserUuid, companyId, tenantId, callback)
{
    try
    {
        if(ext.Conference)
        {
            var curTime = new Date();

            if(ext.Conference.StartDate <= curTime && ext.Conference.EndDate >= curTime)
            //check conference has started or not
            //check conference limit

            if(direction === 'IN')
            {
                if(ext.Conference.AllowAnonymousUser)
                {
                    //normal conference dialplan
                }
                else
                {
                    //dont allow
                }
            }
            else
            {
                //check from user is in conference - use underscore js
            }


        }

    }
    catch(ex)
    {

    }
}