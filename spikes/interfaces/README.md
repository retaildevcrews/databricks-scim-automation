# Interface to Create and Execute Databricks SCIM Automation

## GUI

* Install the `graph` directory dependencies
  * `cd ../graph`
  * `npm install`
* Install the interface dependencies
  * `cd ./interfaces`
  * `npm install`
* Set environmental variables
  * Copy `./interfaces/.env-sample` and rename `./interfaces/.env`
  * Update optional variables `PORT`
* Run the GUI: `npm run start:gui`
* Open browser: localhost:1337
* Login must be by a user of the application inorder to obtain a token with required delegated application permissions
* Fill out inputs with `**` beside them

## CLI

### Set up CLI

* Install the `graph` directory dependencies
  * `cd ../graph`
  * `npm install`
* Install the interface dependencies
  * `cd ./interfaces`
  * `npm install`
* Set environmental variables
  * Copy `./interfaces/.env-sample` and rename `./interfaces/.env`
  * Update required variables `DATABRICKS_URL`, `DATABRICKS_PAT`
  * Update optional variables `PORT`

### Sync Service Principal AAD Groups

* `npm run start:cli`

### Run CLI Development

* `npm run dev:cli`
