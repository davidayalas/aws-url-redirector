'use strict';

const s3select = require("./s3select");
  
exports.handler = async (event, context, callback) => {
    
    const result = JSON.parse(await s3select.query({
      "Bucket" : event.Records[0].cf.request.origin.custom.customHeaders["bucket"][0].value,
      "Key": event.Records[0].cf.request.origin.custom.customHeaders["rules"][0].value, 
      "Expression": `select * from s3object s where s.host='${event.Records[0].cf.request.headers.host[0].value}' and s.path='${event.Records[0].cf.request.uri}'`,
    }));
    
    let response = {
        status: '301',
        statusDescription: 'Found',
        headers: {
            location: [{
                key: 'Location',
                value : ''
            }]
        },
    };
    
    if(result.length>0){
        response.headers.location[0].value = result[0][2];
    }else{
        response.status = 404;
        response.statusDescription = "Not found";
    }

    callback(null, response);
};