'use strict';

let sts = null;

exports.setCredentials = async (_AWS, role) => {
    
    sts = !sts ? new _AWS.STS() : sts;
    
    return new Promise((resolve, reject) => {
        sts.assumeRole({
            RoleArn: role,
            RoleSessionName: 'cloud-redirector'
        }).promise().then(function(data){
            _AWS.config.accessKeyId = data.Credentials.AccessKeyId;
            _AWS.config.secretAccessKey = data.Credentials.SecretAccessKey;
            _AWS.config.sessionToken = data.Credentials.SessionToken;
            resolve(data.Credentials);
        }).catch((err) => {
            console.log(err, err.stack);
            reject(err);
        });
    });
};

exports.getHeaderObjects = function(event){
    let customHeaders = null;
    let headers = null;
    if(event.Records[0].cf.request && event.Records[0].cf.request.origin && event.Records[0].cf.request.origin.custom && event.Records[0].cf.request.origin.custom.customHeaders){
        customHeaders = event.Records[0].cf.request.origin.custom.customHeaders;
    }
    if(event.Records[0].cf.request.headers){
        headers = event.Records[0].cf.request.headers;
    }
    return [customHeaders, headers];

};

exports.getHeader = (obj, header) => {
    if(obj[header] && obj[header].length>0 && obj[header][0].value){
        return obj[header][0].value;
    }
    return null;
};