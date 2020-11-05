# Spreadsheet to publish Cloud Redirector Rules to S3

1. Create a spreadsheet
1. Edit scripts and copy indes.gs
1. Add this library "MB4837UymyETXyn8cv3fNXZc9ncYTrHL9" to script resources (detail: https://engetc.com/projects/amazon-s3-api-binding-for-google-apps-script/)
1. Script properties
    * KEY: aws key
    * SECRET: aws secret
    * cloudfront: cloudfront host (no protocol, example xxxxxx.cloudfront.net)
    * x-api-key: setted in deployment of Cloud Redirector
    * bucket
    * rules: csv file  
