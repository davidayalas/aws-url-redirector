'use strict';

const s3select = require("./s3select");
  
exports.handler = async (event, context, callback) => {
    
    const result = JSON.parse(await s3select.query({
      "Bucket" : event.Records[0].cf.request.origin.custom.customHeaders["bucket"][0].value,
      "Key": event.Records[0].cf.request.origin.custom.customHeaders["rules"][0].value, 
      "Expression": `select s.redirect from s3object s where s.host='${event.Records[0].cf.request.headers.host[0].value}' and s.path='${event.Records[0].cf.request.uri==="/" ? "" : event.Records[0].cf.request.uri}' limit 1`,
    }));
    
    let response = {
        status: '301',
        statusDescription: 'Found',
        headers: {
            location: [{
                key: 'Location',
                value : ''
            }],
            "Cache-Control": [{
                key: 'Cache-Control',
                value: 'public, no-cache'
            }]
        },
    };
    
    if(result.length>0){
        response.headers.location[0].value = result[0][0];
    }else{
        response.status = 404;
        response.statusDescription = "Not found " + `select s.redirect from s3object s where s.host='${event.Records[0].cf.request.headers.host[0].value}' and s.path='${event.Records[0].cf.request.uri==="/" ? "" : event.Records[0].cf.request.uri}' limit 1`;
    }

    callback(null, response);
};