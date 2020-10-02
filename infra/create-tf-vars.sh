#!/bin/bash

# check if scim_Name is valid
function usage(){
  echo -e "usage: scim_Name=[unique-name] $0"
  echo -e "   or: export scim_Name=[unique-name] && $0"
  echo -e "Note that: 'scim_Name' can't have any special chars with length between 5-20"
}
echo "SCIM-Name provided: '$scim_Name'"
script_dir=$(dirname $(realpath $0))
tf_file=${script_dir}/terraform.tfvars
pat_special_chars="[!@#$%^&*()+,.?~\":{}|<> ]"
Name_Size=${#scim_Name}
if [[ $Name_Size -lt 5 || $Name_Size -gt 20 || "$scim_Name" =~ ${pat_special_chars} ]]; then
  usage
  exit 1
fi
#exit
# set location to centralus if not set
[[ -z $scim_Location || ${#scim_Location} == 0 ]] && scim_Location=southcentralus
#  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>TODO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# set repo to databricks-scrime-automation if not set
# if [ -z $scim_Repo ]
# then
#   export scim_Repo=databricks-scrime-automation
# fi

# create terraform.tfvars and replace template values

# Template from example.tfvars
#LOCATION         = "<<scim_Location>>"
#NAME             = "<<scim_Name>>"
#TF_SUB_ID        = "<<scim_SUB_ID>>"
#TF_CLIENT_ID     = "<<scim_CLIENT_ID>>"
#TF_CLIENT_SECRET = "<<scim_CLIENT_SECRET>>"
#TF_TENANT_ID     = "<<scim_TENANT_ID>>"
#COSMOS_RU        = "1000"


LOCATION="$scim_Location"
NAME="$scim_Name"
TF_TENANT_ID="$(az account show -o tsv --query tenantId)"
TF_SUB_ID="$(az account show -o tsv --query id)"
TF_CLIENT_SECRET="$(az ad sp create-for-rbac -n http://${scim_Name}-tf-sp --query password -o tsv)"
TF_CLIENT_ID="$(az ad sp show --id http://${scim_Name}-tf-sp --query appId -o tsv)"
COSMOS_RU=1000
#cp example.tfvars terraform.tfvars
# Backup previous terraform.tfvars file is present
if [[ -f "${tf_file}" ]]; then
  bak="${tf_file}.bak.$(date +%s)"
  cat "${tf_file}" >| $bak
  echo "Backing up $(basename ${tf_file}) file to $bak"
fi

# Output to ${tf_file}
echo Writing to ${tf_file}
printf '%-20s= "%s"\n' LOCATION $LOCATION >| ${tf_file} # --> Make sure we're overwriting the file with >|
printf '%-20s= "%s"\n' NAME $NAME >> ${tf_file}
printf '%-20s= "%s"\n' TF_SUB_ID $TF_SUB_ID >> ${tf_file}
printf '%-20s= "%s"\n' TF_TENANT_ID $TF_TENANT_ID >> ${tf_file}
printf '%-20s= "%s"\n' TF_CLIENT_ID $TF_CLIENT_ID >> ${tf_file}
printf '%-20s= "%s"\n' TF_CLIENT_SECRET $TF_CLIENT_SECRET >> ${tf_file}
printf '%-20s= "%s"\n' COSMOS_RU $COSMOS_RU >> ${tf_file}
# validate the substitutions
cat ${tf_file}