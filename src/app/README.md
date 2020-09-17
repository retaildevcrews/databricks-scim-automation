# Databricks-SCIM-Automation for CSV

## Setup App

* Execute `npm install`
* Copy `./interfaces/.env-sample` and rename `./interfaces/.env`
  * Update required variables `TENANT_ID`, `APP_SERVICE_CLIENT_ID`, `APP_SERVICE_CLIENT_SECRET`, `GALLERY_APP_TEMPLATE_ID`, and `SCIM_TEMPLATE_ID`
  * Update optional variables `PORT`

## Run App for Development

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databircks Url`, and `Databricks Pat`
  * The order is important
* Execute `npm start <path_to_file>`

## Run App

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databircks Url`, and `Databricks Pat`
  * The order is important
* Save the CSV file as `./mocks/syncs.csv`
* Execute `npm run dev`

## End User Notes

* There is no restriction on duplicating SCIM connector gallery app name, which may make managing difficult in the future.
* If there is more than one AAD group with the same name, will use the first one returned from the API.
