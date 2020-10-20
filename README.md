# DataBricks SCIM Automation

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Description

Create a service principal from a SCIM Connector Gallery App that will sync users in an AAD group to a specified Databricks workspace. Then create and start an initial sync job.

## Features

- Create a single SCIM app and execute initial sync job via CLI
- Create multiple SCIM apps from a CSV and execute all initial sync jobs via CLI
- Create a single SCIM app and execute initial sync job via GUI
- Notes on SCIM sync cadence at [./src/app/README.md > End User Notes](./src/app/README.md#scim-sync-cadence)

## Prerequisites

- Azure subscription with permissions to create:
  - Resource Groups, Service Principals, and Key Vault
- App registration with permissions to use:
  - Microsoft Graph API
  - Databricks API
- At least one instance created of:
  - Azure Databricks
  - a non-empty AAD Group created
- Azure CLI or Terraform for Infrastructure
- Node for CLI/GUI 12.18.4+ ([download](https://nodejs.org/en/download/))

## Setup Infrastructure

### Terraform

Follow the instructions in [./infraREADME.md](./infra/README.md) to create needed infrastructure.

### CLI

#### Login to Azure and select subscription

```bash

az login

# show your Azure accounts
az account list -o table

# select the Azure subscription if necessary
az account set -s {subscription name or Id}

```

#### Choose a unique DNS name

```bash

# this will be the prefix for all resources
# only use a-z and 0-9 - do not include punctuation or uppercase characters
# must be at least 5 characters long
# must start with a-z (only lowercase)
export SCIM_Name=your_unique_name

### if nslookup doesn't fail to resolve, change He_Name
nslookup ${SCIM_Name}.vault.azure.net

```

#### Create Resource Group

```bash

# set location
export SCIM_Location=centralus

# set resource group name
export SCIM_App_RG=${SCIM_Name}-rg-app

# create resource group

az group create -n $SCIM_App_RG -l $SCIM_Location

```

#### Create Azure Key Vault

```bash

## create the Key Vault
az keyvault create -g $SCIM_App_RG -n $SCIM_Name-kv

```

Key Vault does a soft delete when deleting vaults. If you have gone through this setup already, you could run into errors like "Exist soft deleted vault with the same name.", and "Secret is currently in a deleted but recoverable state ...". You can check if you have deleted vaults and keys with the commands below.

```bash

# list deleted keyvaults that still exist
az keyvault list-deleted -o table

# list deleted secrets that still exist
az keyvault secret list-deleted --vault-name $SCIM_Name-kv -o table

```

If you see the SCIM App related vaults or secrets in this state, you can purge or recover the values before moving forward. There are example commands below for deleting and purging a keyvault.

```bash

# Deleting a keyvault if you intend to reuse the same name.
az keyvault delete -g $SCIM_App_RG -n $SCIM_Name-kv

# Purging a key vault. This will permanently delete the keyvault and all its contents.
az keyvault purge  -n $SCIM_Name-kv

```

#### Create App Registration and add Azure Key Vault secrets

```bash

# create a Service Principal and add password to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "AppClientSecret" --skip-assignment --value $(az ad sp create-for-rbac -n http://${SCIM_Name}-scim-app-sp --query password -o tsv)

# add Service Principal ID to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "AppClientID" --value $(az ad sp show --id http://${SCIM_Name}-scim-app-sp --query appId -o tsv)

# add tenant ID to Key Vault
az keyvault secret set -o table --vault-name $SCIM_Name-kv --name "TenantID" --value $(az account show --query tenantId -o tsv)

```

## Configure Environment and Permissions

Update required environment variables.

```bash

# ensure you are in the /src/app directory
cd src/app

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

Configure App Registration

```bash

# retrieve App Registration AppId from Key Vault
export SCIM_SP_ID='az keyvault secret show -o tsv --query value --vault-name $He_Name --name AcrUserId'

# add redirect uri and allow implicit grant flow for OAuth 2
az ad app update --id $(eval $SCIM_SP_ID) --reply-urls http://localhost:${PORT} --oauth2-allow-implicit-flow

```

Add required permissions to the App Registration

```bash

az ad app permission add --id $(eval $SCIM_SP_ID) --api 00000003-0000-0000-c000-000000000000 --api-permissions bdfbf15f-ee85-4955-8675-146e8e5296b5 84bccea3-f856-4a8a-967b-dbe0a3d53a64 06da0dbc-49e2-44d2-8312-53f166ab848a

az ad app permission add --id $(eval $SCIM_SP_ID) --api 2ff814a6-3304-4ab8-85cb-cd0e6f879c1d --api-permissions 739272be-e143-11e8-9f32-f2801f1b9fd1


```

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
