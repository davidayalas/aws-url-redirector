'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const utils = require('../utils');

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
    });   
}

exports.handler = async (event, context, callback) => {

    const [customHeaders, headers] = utils.getHeaderObjects(event);

    const role = utils.getHeader(customHeaders,"role");
    const apiKey = utils.getHeader(customHeaders, "api-key");
    const bucket = utils.getHeader(customHeaders, "bucket");
    const rules = utils.getHeader(customHeaders, "rules");

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

    const currentDate = new Date();
    const expiresMinutes = 120;
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