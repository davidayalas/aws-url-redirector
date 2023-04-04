'use strict';

const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const client = new CloudFrontClient({ region: "us-east-1" });
const utils = require('../utils');

exports.handler = async (event, context, callback) => {

    const [customHeaders, headers] = utils.getHeaderObjects(event);
    const apiKey = utils.getHeader(customHeaders, "api-key");
    const distributionId = utils.getHeader(customHeaders, "cloudfrontid");
    let invalidatePaths = utils.getHeader(headers, "x-invalidatepaths");
    invalidatePaths = !invalidatePaths ? "" : invalidatePaths;
    invalidatePaths = invalidatePaths.split(",");
    invalidatePaths = invalidatePaths.map(Function.prototype.call, String.prototype.trim);

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

    const input = {
        DistributionId: distributionId, 
        InvalidationBatch: { 
            CallerReference: ""+(+new Date),
            Paths: { 
                Quantity: invalidatePaths.length, 
                Items: invalidatePaths
            }
        }
    };
    
    const command = new CreateInvalidationCommand(input);

    try{
        const invalidationResponse = await client.send(command);
        response.headers = {
            'content-type': [{
                key: 'Content-Type',
                value: 'application/json'
            }]
        };
        response.body = invalidationResponse;
    }catch(e){
        console.log(e.message);
        response.status='503';        
        response.statusDescription='Error';
    }
    
    callback(null, response);
};