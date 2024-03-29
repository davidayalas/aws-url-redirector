'use strict';

const s3select = require("./s3select");
const utils = require("../utils");

let regexp;
let regexpTimeStamp = null;

async function checkRegexp(bucket, regFile, host, uri, ttl){
    if(!regexp || (+new Date)>regexpTimeStamp){
        regexp = JSON.parse(await s3select.query({
          "Bucket" : bucket,
          "Key": regFile, 
          "Expression": `select * from s3object s`
        }));
        regexpTimeStamp = (+new Date)+ttl;
    }
    
    let re;

    for(let i=0,z=regexp.length; i<z; i++){
        if(regexp[i][0]!==host){
            continue;
        }
        re = new RegExp(regexp[i][1]);
        if(re.test(uri)){
            return uri.replace(re, regexp[i][2]);
        }
    }
    return null;
}
  
exports.handler = async (event, context, callback) => {
    
    const [customHeaders, headers] = utils.getHeaderObjects(event);
    
    const rules = utils.getHeader(customHeaders, "rules");
    const regexpfile = utils.getHeader(customHeaders, "regexp");
    const bucket = utils.getHeader(customHeaders, "bucket");
    const regexpTTL = utils.getHeader(customHeaders, "regexpTTL") || 10000;
    
    const host = utils.getHeader(headers,"host");
    let uri = event.Records[0].cf.request.uri;
    uri = uri==="/" ? "" : uri;

    let response = {
        status: '301',
        statusDescription: 'Found',
        headers: {
            "location": [{
                key: 'Location',
                value : ''
            }],
            "cache-control": [{
                key: 'Cache-Control',
                value: 'public, no-cache'
            }]
        },
    };

    const result = JSON.parse(await s3select.query({
      "Bucket" : bucket,
      "Key": rules, 
      "Expression": `select s.redirect from s3object s where s.host='${host}' and s.path='${uri}' limit 1`,
    }));

    if(result.length>0){
        response.headers.location[0].value = result[0][0];
    }else{
        const result = await checkRegexp(bucket, regexpfile, host, uri, regexpTTL);
        if(result){
            response.headers.location[0].value = result;
        }else{
            response.status = 404;
            response.statusDescription = "Not found";
        }
    }

    callback(null, response);
};