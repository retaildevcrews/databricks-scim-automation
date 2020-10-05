# Terraform to Setup App Service, Key Vault, and CosmosDB

## Prerequisites
- Azure CLI 2.12.1+ ([download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest))
- Terraform 0.13.4+ ([download](https://www.terraform.io/downloads.html))

## Configure AZ CLI

### Login to Azure

```bash
az login
```

### Set Azure Subscription

```bash
az account list -o table
>> Name | CloudName | SubscriptionId | State | IsDefault

az account set -s {Name or SubscriptionId}
```

## Set Terraform Variables

**All commands must be executed in _databricks-scim-automation/infra_**

### Choose a unique DNS name

```bash
# this will be the prefix for all resources
#  only use a-z and 0-9 - do not include punctuation or uppercase characters
#  must be at least 5 characters long
#  must start with a-z (only lowercase)
export scim_Name=[your unique name]
```

```bash
# If true, change scim_Name
az cosmosdb check-name-exists -n ${scim_Name}

# If nslookup finds server, change scim_Name
nslookup ${scim_Name}.azurewebsites.net
nslookup ${scim_Name}.vault.azure.net
```

### Set Location (Optional)

```bash
export scim_Location=centralus
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

- Terraform creates an app registration and KeyVault
- Terraform keeps the following secrets in KeyVault: `TenantID`, `AppClientId`, `AppClientSecret`
- To view (or use) the KeyVault secrets with a user or service principal, the target user or service principal needs to be added to the Access Policy of that Key Vault.
- Access can be set via Azure cli or from the Azure Portal

### From the Azure Portal<a name="accessing-keyvault-secrets"></a>

- Go to the KeyVault created by Terraform (i.e. `${scim_Name}-kv`)
- Go to "Access Policies"
- Click `+ Add Access Policy`
  - `Configure From template (optional)` > `Secret Management`
  - `Secret Permissions` > `Secret Management Operations` > `Get`, `List`, `Set`, `Delete`, `Recover`, `Backup`, `Restore`
  - `Select Principal` > `${scim_Name}-tf-sp`
  - Click "Add"
- Click `+ Add Access Policy`
  - `Configure From template (optional)` > `Secret Management`
  - `Secret Permissions` > `Secret Management Operations` > `Get`, `List`
  - `Select Principal` > `${scim_Name}`
  - Click "Add"
- Click `+ Add Access Policy`
  - `Configure From template (optional)` > `Secret Management`
  - `Secret Permissions` > `Secret Management Operations` > `Get`
  - `Select Principal` > `{User Executing App}`
  - Click "Add"
- Click `Save`

### From the Azure CLI

Usually you can go to Azure Portal and take a note of your target object's (user/sp/app) ID.
Or you can also get it from Azure CLI. Shown below, execute one of them depending on your target

```bash
# If trying to add a specific user
az ad user show --id "EMAIL_ADDRESS_FOR_USER" --query '[displayName, objectId]'

# Or service principal
az ad sp show --id "APP_ID_OR_ANY_IDENTIFIER" --query '[displayName, objectId]'

# Or an app
az ad app show --id "APP_ID_OR_ANY_IDENTIFIER" --query '[displayName, objectId]'
```

Add the user/sp/app to your keyvaults access policy

```bash
az keyvault set-policy --name KV_NAME_FROM_TERRAFORM --object-id ID_FROM_PREV_STEP --secret-permissions get set list
# For more list of permissions goto: https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest#az-keyvault-set-policy
```
