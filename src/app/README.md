# Databricks-SCIM-Automation for CSV

## Setup App

* Execute `npm install`
* Copy `.env-sample` and rename `.env`
  * Update required variables  `GALLERY_APP_TEMPLATE_ID`, `SCIM_TEMPLATE_ID`, and `KEYVAULT_URL`
  * Note: if created via infra/terraform, keyvault URL is `https://{​​​​​scim_Name}​​​​​-kv.vault.azure.net`, otherwise find in Azure Portal
  * Update optional variables `PORT`
* Update permissions of app service client (if created via infra/terraform, app name is {scim_Name}-tf-sp)
  * Active Directory > App Registration > {Name of App Service Client} > Authentication
    * Add a Platform > Web > Redirect URIs: <http://localhost:{1337|.env.PORT>}
    * Select Access Tokens option > Save
* Add required API permissions to App (if created via infra/terraform, app name is {scim_Name}-tf-sp)
  * Active Directory > App Registration > {Name of App Service Client} > API Permissions
    * `@databricks-scim-automation/graph` > getAadGroups (Required Permission): Microsoft Graph > Delegated permissions > Directory.Read.All
    * `@databricks-scim-automation/graph` > getServicePrincipal (Required Permission): Microsoft Graph > Delegated permissions > Directory.Read.All
    * `@databricks-scim-automation/graph` > postAddAadGroupToServicePrincipal (Required Permission): Microsoft Graph > Delegated permissions > AppRoleAssignment.ReadWrite.All
    * `@databricks-scim-automation/graph` > postDatabricksAccessToken (Required Permission): APIs my organization uses > AzureDatabricks > user_impersonation
* Grant admin consent for Default Directory (if created via infra/terraform, app name is {scim_Name}-tf-sp)
  * Active Directory > App Registration > {Name of App Service Client} > API Permissions > Grant admin consent for Default Directory

## Run CSV CLI App

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databricks Url`
  * The order is important
  * Databricks Url format: https://adb-*.*.azuredatabricks.net
* Execute `npm start <path_to_file>`
* Find completed logs at `./outputs/<input_csv_filename>`
  * If file already exists, logs will be appended to content
  * Status of 'n/a' indicates that the step was not excuted because a previous step in the sync had failed

## Run CSV CLI App for Development

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Databricks Url`
  * The order is important
  * Databricks Url format: https://adb-*.*.azuredatabricks.net
* Save the CSV file as `./mocks/syncs.csv`
* Execute `npm run dev:csv`
* Find completed logs at `./outputs/<input_csv_filename>`
  * If file already exists, logs will be appended to content
  * Status of 'n/a' indicates that the step was not excuted because a previous step in the sync had failed

## Run Single CLI

* `npm start`

## Run Single CLI for Development

* `npm run dev:cli`

## Run GUI

* Run the GUI: `npm run start:gui`
* Open browser: localhost:1337
* Login must be by a user of the application inorder to obtain a token with required delegated application permissions
* Fill out inputs with `**` beside them

## End User Notes

* There is no restriction on duplicating SCIM connector gallery app name, which may make managing difficult in the future.
* If there is more than one AAD group with the same name, will use the first one returned from the API.
