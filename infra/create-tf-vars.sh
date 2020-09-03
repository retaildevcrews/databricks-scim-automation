#!/bin/bash

# check if scim_Name is valid

Name_Size=${#scim_Name}
if [[ $Name_Size -lt 5 || $Name_Size -gt 20 ]]
then
  echo "Please set scim_Name first and make sure it is between 5 and 20 characters in length with no special characters."
  echo $scim_Name
  echo $Name_Size
  exit 1
fi



# set location to centralus if not set
if [ -z $scim_Location ]
then
  export scim_Location=centralus
fi
#  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>TODO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# set repo to databricks-scrime-automation if not set
# if [ -z $scim_Repo ]
# then
#   export scim_Repo=databricks-scrime-automation
# fi

# create terraform.tfvars and replace template values






cp example.tfvars terraform.tfvars

# replace name
ex -s -c "%s/<<scim_Name>>/$scim_Name/g|x" terraform.tfvars

# replace location
ex -s -c "%s/<<scim_Location>>/$scim_Location/g|x" terraform.tfvars

# replace repo
# ex -s -c "%s/<<scim_Repo>>/$scim_Repo/g|x" terraform.tfvars

# replace email
# ex -s -c "%s/<<scim_Email>>/$scim_Email/g|x" terraform.tfvars

# replace TF_TENANT_ID
ex -s -c "%s/<<scim_TENANT_ID>>/$(az account show -o tsv --query tenantId)/g|x" terraform.tfvars

# replace TF_SUB_ID
ex -s -c "%s/<<scim_SUB_ID>>/$(az account show -o tsv --query id)/g|x" terraform.tfvars

# create a service principal
# replace TF_CLIENT_SECRET
ex -s -c "%s/<<scim_CLIENT_SECRET>>/$(az ad sp create-for-rbac -n http://${scim_Name}-tf-sp --query password -o tsv)/g|x" terraform.tfvars

# replace TF_CLIENT_ID
ex -s -c "%s/<<scim_CLIENT_ID>>/$(az ad sp show --id http://${scim_Name}-tf-sp --query appId -o tsv)/g|x" terraform.tfvars

# create a service principal
# replace ACR_SP_SECRET
# ex -s -c "%s/<<scim_ACR_SP_SECRET>>/$(az ad sp create-for-rbac --skip-assignment -n http://${scim_Name}-acr-sp --query password -o tsv)/g|x" terraform.tfvars

# replace ACR_SP_ID
# ex -s -c "%s/<<scim_ACR_SP_ID>>/$(az ad sp show --id http://${scim_Name}-acr-sp --query appId -o tsv)/g|x" terraform.tfvars

# validate the substitutions
cat terraform.tfvars