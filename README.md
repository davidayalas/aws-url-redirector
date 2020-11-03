# Universal cloud redirector

* Simple Lambda@Edge redirector manager
* Rules are configured into CSV file in S3 (s3 select to search)

![](docs/cloud-redirect.png)

# Endpoints (behaviors)

* /${path} --> it will search for path and the host requested into the CSV
* /sign/ --> it will return a S3 signed form to upload a rules.csv file. Params:
    * x-api-key: defined in setup.demo.json
* /invalidate/ --> POST. It will generate a invalidation request. Params
    * x-api-key: defined in setup.demo.json
    * x-invalidatepath: a string containing the path to invalidate

# Guides
- https://medium.com/@mnylen/lambda-edge-gotchas-and-tips-93083f8b4152

# TODO

- Sheet to manage redirect rules
- Terraform template