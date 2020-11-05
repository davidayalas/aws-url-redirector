# Universal cloud redirector

* Simple Lambda@Edge redirector manager
* Rules are configured into CSV file in S3 (s3 select to search)

![](docs/cloud-redirect.png)

# Endpoints (behaviors)

* /${path} --> it will search for path and the host requested into the CSV
* /invalidate/ --> POST. It will generate a invalidation request. Params
    * x-api-key: defined in setup.demo.json
    * x-invalidatepaths: a string containing the paths to invalidate, comma separated
* /sign/ --> it will return a S3 signed form to upload a rules.csv file (not used at this time). Params:
    * x-api-key: defined in setup.demo.json

# Notes

* Distribution id has to be set manually in setup.demo.json after a first deploy of the stack... no way

# Guides
- https://medium.com/@mnylen/lambda-edge-gotchas-and-tips-93083f8b4152

# TODO

- Terraform template