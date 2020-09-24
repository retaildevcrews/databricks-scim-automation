### Login to Azure

```bash
az login

###  show your Azure accounts
az account list -o table

###  select the Azure subscription if necessary
az account set -s {subscription name or Id}
```

>All commands require you to be in databricks-scim-automation/infra

### Choose a unique DNS name
```bash
# this will be the prefix for all resources
#  only use a-z and 0-9 - do not include punctuation or uppercase characters
#  must be at least 5 characters long
#  must start with a-z (only lowercase)
export scim_Name=[your unique name]
```
### if true, change scim_Name
```bash
az cosmosdb check-name-exists -n ${scim_Name}

### if nslookup doesn't fail to resolve, change scim_Name
nslookup ${scim_Name}.azurewebsites.net
nslookup ${scim_Name}.vault.azure.net

# no CR for this project yet
# nslookup ${scim_Name}.azurecr.io 

# Set additional values
# export scim_Email=replaceWithYourEmail

### change the location (optional)
export scim_Location=centralus

###  >>>>>>>>>>>>>>>>>>>>>>>>> TODO <<<<<<<<<<<<<<<<<<<<<<<<<<
###  change the repo (optional - valid: test-csharp, test-java, test-typescript)
export scim_Repo=test-csharp
## Deploy databricks-scrime-automation
## Make sure you are in the scim-terraform/src/infra directory 

### create tfvars file
./create-tf-vars.sh

###  initialize
terraform init

###  validate
terraform validate

###  If you have no errors you can create the resources
terraform apply # Will prompt for confirmation, type 'yes' if all-ok
# To avoid confirmation prompt: use the cmd below (with caution)
#terraform apply -auto-approve

###  This generally takes about 10 minutes to complete
```

### Accessing KeyVault's Secrets
By default a Service Principal by terraform is created for terraform usage. And that SP owns access of the KV secrets
To view(or use) the KV sercrets with a different User/service-principal, the target User/SP needs to be added to the Access Policy of that Key Vault. It can be done via Azure cli or from the azure portal

### From the Azure Portal
- Goto the respective key vault created by Terraform
- Goto "Access Policies"
- Click on "+ Add Access Policy"
  - Under "Configure From template (optional)" Select "Secret Management"
  - Under "Secret Permissions" select required management operations (e.g. Get, List, Set, Delete etc)
  - Select Principal (add user, Service Principal, group or app)
  - Click "Add"
- After adding, make sure to save the Access Policy

### From the Azure CLI
#### Note the User/Service Principal/App/Group ID
Usually you can goto Azure Portal and take a note of your target object's (user/sp/app) ID.
Or you can also get it from Azure CLI. Shown below, execute one of them depending on your target
```bash
# If trying to add a specific user
az ad user show --id "EMAIL_ADDRESS_FOR_USER" --query '[displayName, objectId]'

# Or service principal
az ad sp show --id "APP_ID_OR_ANY_IDENTIFIER" --query '[displayName, objectId]'

# Or an app
az ad app show --id "APP_ID_OR_ANY_IDENTIFIER" --query '[displayName, objectId]'
```

#### Now add that user/sp/app to your keyvaults access policy
```bash
az keyvault set-policy --name KV_NAME_FROM_TERRAFORM --object-id ID_FROM_PREV_STEP --secret-permissions get set list
# For more list of permissions goto: https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest#az-keyvault-set-policy
```