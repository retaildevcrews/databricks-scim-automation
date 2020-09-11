# Graph Dependency

## Installation

* Install the `graph` directory dependencies
  * `cd ./interfaces/graph`
  * `npm install`
* Set environmental variables
  * Copy `./interfaces/.env-sample` and rename `./interfaces/.env`
  * Update variables `TENANT_ID`, `APP_SERVICE_CLIENT_ID`, `APP_SERVICE_CLIENT_SECRET`, `DATABRICKS_URL`, and `DATABRICKS_PAT`

## Use

* Wraps Microsoft Graph APIs in an executable function for easy of use
* Provides an array of steps in the order of execution to syncronize a Databricks Workspace with an AAD group
