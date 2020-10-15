# Databricks-SCIM-Automation for CSV

## Setup App

* (Optional) Use `databricks-scim-automation/infra` to create infrastructure
  * Must have following KeyVault Secrets: `TenantID`, `AppClientId`, `AppClientSecret`
  * Required permissions for KeyVault included in [databricks-scim-automation/infra/README.md](../../infra/README.md#accessing-keyvault-secrets)
* Execute `npm install` from /src/app
  * The following output is expected and safe to ignore:

```bash

npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.1.3 (node_modules/@databricks-scim-automation/graph/node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.1.3: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.1.3 (node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.1.3: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})

# This is safe to ignore as well as it does not impact the functionality of the unit tests
npm WARN chai-fetch-mock@3.0.0 requires a peer of fetch-mock@5.1.x || 6.x but none is installed. You must install peer dependencies yourself.

```

* Copy `.env-sample` and rename `.env`
  * Update required variables  `GALLERY_APP_TEMPLATE_ID`, `SCIM_TEMPLATE_ID`, and `KEYVAULT_URL`
    * If created infrastructure via `databricks-scim-automation/infra`, `KEYVAULT_URL` is `https://{​​​​​scim_Name}​​​​​-kv.vault.azure.net`, otherwise find in Azure Portal
  * Update optional variables `PORT`
* Update permissions of app registration (if created via `databricks-scim-automation/infra`, app name is `{scim_Name}-tf-sp`)
  * `Azure Active Directory` > `App registrations` > `{Name of App Service Client}` > `Authentication`
    * `Add a Platform` > `Web` > `Redirect URIs`: `http://localhost:{1337|.env.PORT}`
    * Select `Implicit grant` > `Access tokens` option
    * Click `Save`
* Add required API permissions to App (if created via `databricks-scim-automation/infra`, app name is `{scim_Name}-tf-sp`)
  * `Azure Active Directory` > `App registrations` > `{Name of App Service Client}` > `API Permissions` > `Add a permission`
    * `@databricks-scim-automation/graph` > getAadGroups (Required Permission): `Microsoft Graph` > `Delegated permissions` > `Directory.Read.All`
    * `@databricks-scim-automation/graph` > getServicePrincipal (Required Permission): `Microsoft Graph` > `Delegated permissions` > `Directory.Read.All`
    * `@databricks-scim-automation/graph` > postAddAadGroupToServicePrincipal (Required Permission): `Microsoft Graph` > `Delegated permissions` > `AppRoleAssignment.ReadWrite.All`
    * `@databricks-scim-automation/graph` > postAddOwner (Required Permission): `Microsoft Graph` > `Delegated permissions` > `Application.ReadWrite.All`
    * `@databricks-scim-automation/graph` > postDatabricksAccessToken (Required Permission): `APIs my organization uses` > `AzureDatabricks` > `user_impersonation`
* Grant admin consent for Default Directory (if created via `databricks-scim-automation/infra`, app name is `{scim_Name}-tf-sp`)
  * `Azure Active Directory` > `App registrations` > `{Name of App Service Client}` > `API Permissions` > Click `Grant admin consent for Default Directory`

## Run CSV CLI App

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Owner Email 1`, `Owner Email 2`, `Databricks Url`
  * The order is important
  * Databricks Url format: https://adb-*.*.azuredatabricks.net
* Execute `npm start <path_to_file>`
* Find completed logs at `./outputs/<input_csv_filename>`
  * If file already exists, logs will be appended to content
  * Status of 'n/a' indicates that the step was not excuted because a previous step in the sync had failed

## Run CSV CLI App for Development

* Create a CSV with the following headers: `SCIM App Name`, `AAD Group`, `Owner Email 1`, `Owner Email 2`, `Databricks Url`
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
* Login must be by a user of the application in order to obtain a token with required delegated application permissions
* Fill out inputs with `**` beside them

## End User Notes

* <a name="scim-sync-cadence"></a>Notes on SCIM Sync Cadence: [Provisioning Tips](https://docs.microsoft.com/en-us/azure/databricks/administration-guide/users-groups/scim/aad#provisioning-tips)

* There is no restriction on duplicating SCIM connector gallery app name, which may make managing difficult in the future.
* If there is more than one AAD group with the same name, will use the first one returned from the API.
