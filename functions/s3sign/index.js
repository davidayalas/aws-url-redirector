'use strict';

const AWS = require('aws-sdk');
const sts = new AWS.STS();
const s3 = new AWS.S3();

async function setCredentials(role){
    return new Promise((resolve, reject) => {
        sts.assumeRole({
            RoleArn: role,
            RoleSessionName: 'cloud-redirector'
        }).promise().then(function(data){
            AWS.config.accessKeyId = data.Credentials.AccessKeyId;
            AWS.config.secretAccessKey = data.Credentials.SecretAccessKey;
            AWS.config.sessionToken = data.Credentials.SessionToken;
            resolve(data.Credentials);
        }).catch((err) => {
            console.log(err, err.stack);
            reject(err);
        });
    });
};

async function getSignature(params, bucket){
    return new Promise((resolve, reject) => {
        s3.createPresignedPost(params, function(err, data) {
          if (err) {
            console.error('Presigning post data encountered an error', err);
          } else {
            let formdata = {};
            formdata.endpoint = data.url;
            formdata.key = bucket + '/${filename}';
            for(let k in data.fields){
                formdata[k] = data.fields[k];
            }
            resolve(JSON.stringify(formdata));
          }
        });    
    })    
}

function getHeader(obj, header){
    if(obj[header] && obj[header].length>0 && obj[header][0].value){
        return obj[header][0].value;
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

    const role = getHeader(customHeaders,"role");
    const apiKey = getHeader(customHeaders, "api-key");
    const bucket = getHeader(customHeaders, "bucket");
    const rules = getHeader(customHeaders, "rules");

    const clientApiKey = getHeader(headers, "x-api-key");

    let response = {
        status: '200',
        statusDescription: 'OK',
        headers: {}
    };
    
    if(!clientApiKey || apiKey!=clientApiKey){
        response.status='403';        
        response.statusDescription='Forbidden';
        callback(null, response);
        return;
    }

    await setCredentials(role);

    const currentDate = new Date();
    const expiresMinutes = 120
    const expires = new Date(currentDate.getTime()+(60000*expiresMinutes));

    const params = {
        Bucket: bucket,
        Conditions: [
     	   ["starts-with", "$key", rules],
 	       {"bucket": bucket},
        ],
        Expiration: expires.toISOString()
    };
    
    const formdata = await getSignature(params, bucket);

    
    response.headers = {
        'content-type': [{
            key: 'Content-Type',
            value: 'application/json'
        }]
    };
    response.body = formdata;
    callback(null, response);
};