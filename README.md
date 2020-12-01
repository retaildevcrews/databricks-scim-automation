# Databricks SCIM Automation

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Description

This application automates the steps described in this [Azure documentation](https://docs.microsoft.com/en-us/azure/databricks/administration-guide/users-groups/scim/aad#:~:text=%20Create%20an%20enterprise%20application%20and%20connect%20to,search%20for%20and...%204%20Click%20Save.%20More%20) to configure a Databricks SCIM provisioning for AAD. The app creates a service principal from a SCIM Connector Gallery App that syncs users in an AAD group to a specified Databricks workspace. It then creates and starts an initial sync job.

The app uses [beta Microsoft Graph APIs](https://documenter.getpostman.com/view/2644780/SzmiWGDE?version=latest#95ddb5a6-eb9c-472c-9d56-7da9eb98c0d2).

## Features

- Create a single SCIM app and execute initial sync job via CLI.
- Create multiple SCIM apps from a csv file and execute all initial sync jobs via CLI.
- Create a single SCIM app and execute initial sync job via GUI.

## Prerequisites

- Azure subscription with permissions to create:
  - Resource Groups, Service Principals, and Key Vault
- App registration with permissions to use:
  - Microsoft Graph API
  - Databricks API
- At least one instance created of:
  - Azure Databricks
  - a non-empty AAD Group created
- Azure CLI ([download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest))
- Node for CLI/GUI 12.18.4+ ([download](https://nodejs.org/en/download/))

## Setup Infrastructure with CLI (bash)

### Login to Azure and select subscription

```bash

az login

# show your Azure accounts
az account list -o table

# select the Azure subscription if necessary
az account set -s {subscription name or Id}

```

### Choose a unique DNS name (for Azure Key Vault)

```bash

# this will be the prefix for all resources
# only use a-z and 0-9 - do not include punctuation or uppercase characters
# must be at least 5 characters long
# must start with a-z (only lowercase)
export SCIM_Name=your_unique_name

### if nslookup doesn't fail to resolve, change He_Name
nslookup ${SCIM_Name}.vault.azure.net

```

### Create Resource Group

```bash

# set location
export SCIM_Location=centralus

# set resource group name
export SCIM_App_RG=${SCIM_Name}-rg-app

# create resource group
az group create -n $SCIM_App_RG -l $SCIM_Location

```

### Create Azure Key Vault

```bash

## create the Key Vault
az keyvault create -g $SCIM_App_RG -n $SCIM_Name-kv

```

### Create App Registration and add Azure Key Vault secrets

```bash

# create a Service Principal and add password to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "AppClientSecret" --value $(az ad sp create-for-rbac --skip-assignment -n http://${SCIM_Name}-scim-app-sp --query password -o tsv)

# add Service Principal ID to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "AppClientID" --value $(az ad sp show --id http://${SCIM_Name}-scim-app-sp --query appId -o tsv)

# add tenant ID to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "TenantID" --value $(az account show --query tenantId -o tsv)

```

## Configure Environment and Permissions

Update required environment variables.

```bash

# ensure you are in the /src/app directory
cd ./src/app

# copy .env-sample and rename to .env
cp .env-sample .env

# update .env file variables as needed
# GALLERY_APP_TEMPLATE_ID and SCIM_TEMPLATE_ID are already configured for the Databricks SCIM Connector

# set KEYVAULT_URL in .env file to
echo https://${SCIM_Name}-kv.vault.azure.net

# PORT is optional (default 1337)

# set the environment variables
source ./.env

```

Validate User Assigned Roles

> To successfully run the application, user needs the following Assigned Role.
> - Application administrator

Configure App Registration

```bash

# retrieve App Registration AppId from Key Vault
export SCIM_SP_ID='az keyvault secret show -o tsv --query value --vault-name $SCIM_Name-kv --name AppClientID'

# make sure the PORT variable is set to the same one in the .env file
echo $PORT

# add redirect uri and allow implicit grant flow with access tokens for OAuth 2
az ad app update --id $(eval $SCIM_SP_ID) --reply-urls http://localhost:${PORT} --oauth2-allow-implicit-flow true

```

Add required permissions to the App Registration

> To successfully call the required Microsoft Graph and Azure Databricks API's, the following API permissions are required:
>
> - Microsoft Graph (Delegated permissions):
>   - Directory.Read.All
>   - AppRoleAssignment.ReadWrite.All
>   - Application.ReadWrite.All
> - Azure Databricks (API Name: AzureDatabricks, Delegated permissions):
>   - user_impersonation

```bash

# make sure you are in the root directory of the repo
cd ../../

# the permissions listed above are specified in the permissions.json file located in the root directory of the repo
# apply the API permissions
az ad app update --id $(eval $SCIM_SP_ID) --required-resource-accesses @permissions.json

```

## Accessing Key Vault Secrets

- To view and use the KeyVault secrets with a user or service principal, the target user or service principal needs to be added to the Access Policy of that Key Vault.
- Only users with read and list access to the Key Vault will be able to successfully run this app.

### Add users or service prinicpals to Key Vault Access Policy

```bash

# grant Key Vault access to a user or service principal
az keyvault set-policy -n $SCIM_Name-kv --secret-permissions get list --key-permissions get list --object-id $(az ad user show --query objectId -o tsv --id {user email address or service principal AppId})

```

## Run the application

See instructions on running the app [here](./src/app/README.md)

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Microsoft Contributor License Agreement](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
