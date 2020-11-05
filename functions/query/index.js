'use strict';

const s3select = require("./s3select");
const utils = require("../utils");

let regexp;

async function checkRegexp(bucket, regFile, host, uri){
    if(!regexp){
        regexp = JSON.parse(await s3select.query({
          "Bucket" : bucket,
          "Key": regFile, 
          "Expression": `select * from s3object s`
        }));
    }
    
    let found = false;
    let re;

    for(let i=0,z=regexp.length; i<z; i++){
        if(regexp[i][0]!==host){
            continue;
        }
        re = new RegExp(regexp[i][1]);
        found = re.test(uri);
        if(found){
            return uri.replace(re, regexp[i][2]);
        }
    }
    return null;
}
  
exports.handler = async (event, context, callback) => {
    
    let customHeaders = null;
    let headers = null;
    if(event.Records[0].cf.request && event.Records[0].cf.request.origin && event.Records[0].cf.request.origin.custom && event.Records[0].cf.request.origin.custom.customHeaders){
        customHeaders = event.Records[0].cf.request.origin.custom.customHeaders;
    }
    if(event.Records[0].cf.request.headers){
        headers = event.Records[0].cf.request.headers;
    }    
    
    const rules = utils.getHeader(customHeaders, "rules");
    const regexpfile = utils.getHeader(customHeaders, "regexp");
    const apiKey = utils.getHeader(customHeaders, "api-key");
    const clientApiKey = utils.getHeader(headers, "x-api-key");
    const bucket = utils.getHeader(customHeaders, "bucket");
    
    const host = utils.getHeader(headers,"host");
    let uri = event.Records[0].cf.request.uri;
    uri = uri==="/" ? "" : uri;

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

    if (event.Records[0].cf.request.method==='POST' && apiKey===clientApiKey){
        regexp=null;
        response.status = "200";
        response.statusDescription = 'Regexp file refresh';
        callback(null, response);
        return;
    }
    
    const result = JSON.parse(await s3select.query({
      "Bucket" : bucket,
      "Key": rules, 
      "Expression": `select s.redirect from s3object s where s.host='${host}' and s.path='${uri}' limit 1`,
    }));

    if(result.length>0){
        response.headers.location[0].value = result[0][0];
    }else{
        const result = await checkRegexp(bucket, regexpfile, host, uri);
        if(result){
            response.headers.location[0].value = result;
        }else{
            response.status = 404;
            response.statusDescription = "Not found " + `select s.redirect from s3object s where s.host='${event.Records[0].cf.request.headers.host[0].value}' and s.path='${event.Records[0].cf.request.uri==="/" ? "" : event.Records[0].cf.request.uri}' limit 1`;
        }
    }

    callback(null, response);
};