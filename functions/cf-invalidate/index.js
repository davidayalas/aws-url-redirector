'use strict';

const AWS = require('aws-sdk');
const sts = new AWS.STS();
const cloudfront = new AWS.CloudFront();

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
}


async function createInvalidation(params){
    return new Promise((resolve, reject) => {
      cloudfront.createInvalidation(params, function(err, data) {
        if(err){
            reject(err.message);
        }else{
            console.log(JSON.stringify(data));
            resolve(JSON.stringify(data));
        }
      });
    });    
}

function getHeader(obj, header){
    if(obj[header] && obj[header].length>0 && obj[header][0].value){
        return obj[header][0].value;
    }
    return "";
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

    const apiKey = getHeader(customHeaders, "api-key");
    const role = getHeader(customHeaders, "role");
    const distributionId = getHeader(customHeaders, "cloudfrontid");
    let invalidatePath = getHeader(headers, "x-invalidatepath");
    invalidatePath = !invalidatePath ? "/kkkk*" : invalidatePath;
    
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

    const reference = +new Date;

    var params = {
        DistributionId: distributionId, 
        InvalidationBatch: { 
            CallerReference: ""+reference,
            Paths: { 
                Quantity: '1', 
                Items: [invalidatePath]
            }
        }
    };

    const result = await createInvalidation(params);
    if(result!=="error"){
        response.headers = {
            'content-type': [{
                key: 'Content-Type',
                value: 'application/json'
            }]
        };
        response.body = result;
    }else{
        response.status='503';        
        response.statusDescription='Error';
    }
    
    callback(null, response);

};