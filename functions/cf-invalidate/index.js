'use strict';

const AWS = require('aws-sdk');
const cloudfront = new AWS.CloudFront();
const utils = require('../utils');

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

exports.handler = async (event, context, callback) => {

    let customHeaders = null;
    let headers = null;
    if(event.Records[0].cf.request && event.Records[0].cf.request.origin && event.Records[0].cf.request.origin.custom && event.Records[0].cf.request.origin.custom.customHeaders){
        customHeaders = event.Records[0].cf.request.origin.custom.customHeaders;
    }
    if(event.Records[0].cf.request.headers){
        headers = event.Records[0].cf.request.headers;
    }

    const apiKey = utils.getHeader(customHeaders, "api-key");
    const role = utils.getHeader(customHeaders, "role");
    const distributionId = utils.getHeader(customHeaders, "cloudfrontid");
    let invalidatePath = utils.getHeader(headers, "x-invalidatepath");
    invalidatePath = !invalidatePath ? "/test*" : invalidatePath;
    
    const clientApiKey = utils.getHeader(headers, "x-api-key");

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

    await utils.setCredentials(AWS, role);

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