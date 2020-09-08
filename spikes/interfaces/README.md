# Interface to Create and Execute Databricks SCIM Automation

## GUI

* Install the `graph` directory dependencies
  * `cd ./interfaces/graph`
  * `npm install`
* Install the interface dependencies
  * `cd ./interfaces`
  * `npm install`
* Set environmental variables
  * Copy `./interfaces/.env-sample` and rename `./interfaces/.env`
  * Update variables `TENANT_ID`, `APP_SERVICE_CLIENT_ID`, `APP_SERVICE_CLIENT_SECRET`, and `DATABRICKS_PAT`
* Run the GUI: `npm run start:gui`
* Open browser: localhost:1337
* Login must be by a user of the application inorder to obtain a token with required delegated application permissions
* Fill out inputs with `**` beside them

## CLI

* `npm run start:cli`
