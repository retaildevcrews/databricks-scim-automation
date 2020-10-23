#!/bin/bash

# check if SCIM_Name is valid
function usage(){
  echo -e "usage: SCIM_Name=[unique-name] $0"
  echo -e "   or: export SCIM_Name=[unique-name] && $0"
  echo -e "Note that: 'SCIM_Name' can't have any special chars with length between 5-20"
}
echo "SCIM-Name provided: '$SCIM_Name'"
script_dir=$(dirname $(realpath $0))
tf_file=${script_dir}/terraform.tfvars
pat_special_chars="[!@#$%^&*()+,.?~\":{}|<> ]"
Name_Size=${#SCIM_Name}
if [[ $Name_Size -lt 5 || $Name_Size -gt 20 || "$SCIM_Name" =~ ${pat_special_chars} ]]; then
  usage
  exit 1
fi
#exit
# set location to centralus if not set
[[ -z $SCIM_Location || ${#SCIM_Location} == 0 ]] && SCIM_Location=southcentralus
#  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>TODO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# set repo to databricks-scim-automation if not set
# if [ -z $SCIM_Repo ]
# then
#   export SCIM_Repo=databricks-scim-automation
# fi

# create terraform.tfvars and replace template values

# Template from example.tfvars
#LOCATION         = "<<SCIM_Location>>"
#NAME             = "<<SCIM_Name>>"
#TF_SUB_ID        = "<<SCIM_SUB_ID>>"
#TF_CLIENT_ID     = "<<SCIM_CLIENT_ID>>"
#TF_CLIENT_SECRET = "<<SCIM_CLIENT_SECRET>>"
#TF_TENANT_ID     = "<<SCIM_TENANT_ID>>"
#COSMOS_RU        = "1000"


LOCATION="$SCIM_Location"
NAME="$SCIM_Name"
TF_TENANT_ID="$(az account show -o tsv --query tenantId)"
TF_SUB_ID="$(az account show -o tsv --query id)"
TF_CLIENT_SECRET="$(az ad sp create-for-rbac -n http://${SCIM_Name}-tf-sp --query password -o tsv)"
TF_CLIENT_ID="$(az ad sp show --id http://${SCIM_Name}-tf-sp --query appId -o tsv)"
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