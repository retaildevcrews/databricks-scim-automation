# Terraform to Setup App Service, Key Vault, and CosmosDB

## Prerequisites

- Azure CLI 2.12.1+ ([download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest))
- Terraform 0.13.4+ ([download](https://www.terraform.io/downloads.html))

## Login to Azure and select subscription

```bash

az login

# show your Azure accounts
az account list -o table

# select the Azure subscription if necessary
az account set -s {subscription name or Id}

```

## Set Terraform Variables

**All commands must be executed in _databricks-scim-automation/infra_**

### Choose a unique DNS name

```bash

# this will be the prefix for all resources
#  only use a-z and 0-9 - do not include punctuation or uppercase characters
#  must be at least 5 characters long
#  must start with a-z (only lowercase)
export SCIM_Name=[your unique name]

```

```bash

# If true, change SCIM_Name
az cosmosdb check-name-exists -n ${SCIM_Name}

# If nslookup finds server, change SCIM_Name
nslookup ${SCIM_Name}.azurewebsites.net
nslookup ${SCIM_Name}.vault.azure.net

```

### Set Location (Optional)

```bash

export SCIM_Location=centralus

```

### Create tfvars Files

- Delete any existing `terraform.tf*` files from previous terraform applies
- Create new tfvars files

```bash

./create-tf-vars.sh

```

## Apply Terraform to Create Infrastructure

### Initialize Terraform

```bash

terraform init

```

### Validate Terraform

```bash

terraform validate

```

If you have no errors you can create the resources

### Create Resources

**_Note: Must have write access to create app registration, KeyVault, and service principal_

```bash

# Will prompt for confirmation, type 'yes' if all-ok
terraform apply
# To avoid confirmation prompt: use the cmd below (with caution)
terraform apply -auto-approve

```

**_Note: This generally takes about 10 minutes to complete_

## Accessing KeyVault Secrets

- Terraform creates an App Registration and Key Vault
- To view and use the KeyVault secrets with a user or service principal, the target user or service principal needs to be added to the Access Policy of that Key Vault.

### Add users or service prinicpals to Key Vault Access Policy

```bash

# grant Key Vault access to user or service principal
az keyvault set-policy -n $SCIM_Name-kv --secret-permissions get list --key-permissions get list --object-id $(az ad user show --query objectId -o tsv --id {user email address or service principal AppId})

```

## Continue following steps in README to [configure environment and permissions](../README.md#configure-environment-and-permissions)
