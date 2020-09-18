# Databricks-SCIM-Automation for CSV

## Setup App

* Execute `npm install`
* Copy `.env-sample` and rename `.env`
  * Update required variables `TENANT_ID`, `APP_SERVICE_CLIENT_ID`, `APP_SERVICE_CLIENT_SECRET`, `GALLERY_APP_TEMPLATE_ID`, and `SCIM_TEMPLATE_ID`
  * Update optional variables `PORT`
* Update permissions of app service client
  * Active Directory > App Registration > {Name of App Service Client} > Authentication > Add a Platform
    * Redirect URIs: http://localhost:{1337|.env.PORT}
    * Access Tokens Selected
* Add required API permissions 
  * Active Directory > App Registration > {Name of App Service Client} > API Permissions
    * `@databricks-scim-automation/graph` > getAadGroups (Required Permission): Delegated Token > Directory.Read.All Permission
    * `@databricks-scim-automation/graph` > getServicePrincipal (Required Permission): Delegated Token > Directory.Read.All Permission
    * `@databricks-scim-automation/graph` > postAddAadGroupToServicePrincipal (Required Permission): Delegated Token >      AppRoleAssignment.ReadWrite.All Permission


## Run App

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databricks Url`, and `Databricks Pat`
  * The order is important
  * Databricks Url format: https://adb-*.*.azuredatabricks.net/api/2.0/preview/scim
* Execute `npm start <path_to_file>`
* Find completed logs at `./outputs/<input_csv_filename>`
  * If file already exists, logs will be appended to content
  * Status of 'n/a' indicates that the step was not excuted because a previous step in the sync had failed

## Run App for Development

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databricks Url`, and `Databricks Pat`
  * The order is important
  * Databricks Url format: https://adb-*.*.azuredatabricks.net/api/2.0/preview/scim
* Save the CSV file as `./mocks/syncs.csv`
* Execute `npm run dev`
* Find completed logs at `./outputs/<input_csv_filename>`
  * If file already exists, logs will be appended to content
  * Status of 'n/a' indicates that the step was not excuted because a previous step in the sync had failed

## End User Notes

* There is no restriction on duplicating SCIM connector gallery app name, which may make managing difficult in the future.
* If there is more than one AAD group with the same name, will use the first one returned from the API.
