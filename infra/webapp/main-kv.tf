
#Use this data source to access the configuration of the AzureRM provider.
data "azurerm_client_config" "current" {}


# Create Key Vault // As of today 8-27-2020 v13.1 has some issues https://github.com/hashicorp/terraform/issues/26011
resource "azurerm_key_vault" "kv" {
  name                            = "${var.NAME}-kv"
  location                        = var.LOCATION
  resource_group_name             = var.APP_RG_NAME
  sku_name                        = "standard"
  tenant_id                       = var.TENANT_ID
  enabled_for_deployment          = false
  enabled_for_disk_encryption     = false
  enabled_for_template_deployment = false
 
 }

resource "azurerm_key_vault_access_policy" "terraform-sp" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id = data.azurerm_client_config.current.tenant_id
  object_id = data.azurerm_client_config.current.object_id

  secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Recover",
      "Backup",
      "Restore"
    ]

}

resource "azurerm_key_vault_access_policy" "web-app-pol" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = var.TENANT_ID  # this access policy will get the name of TenantID -- [scim_Name]
  object_id    = azurerm_app_service.web-app.identity.0.principal_id
  secret_permissions = [
      "Get",
      "List"
  ]

}

 
# https://www.terraform.io/docs/providers/azurerm/r/key_vault_access_policy.html
# NOTE: It's possible to define Key Vault Access Policies both within the azurerm_key_vault resource via the access_policy 
# block and by using the azurerm_key_vault_access_policy resource. 
# However it's not possible to use both methods to manage Access Policies within a KeyVault, since there'll be conflicts.

# resource "azurerm_key_vault_access_policy" "web_app_pol" {
#   key_vault_id = azurerm_key_vault.kv.id
#   tenant_id    = var.TENANT_ID
#   object_id    = data.azurerm_client_config.current.client_id #Service Principal ---azurerm_app_service.web-app.identity.0.principal_id

#   secret_permissions = [
#     "get",
#     "list"
#   ]

# }


resource "azurerm_key_vault_secret" "cosmosurl" {

   depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "CosmosUrl"
  value        = var.COSMOS_URL
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "cosmoskey" {

    depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "CosmosKey"
  value        = var.COSMOS_KEY
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "cosmosdatabase" {

  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "CosmosDatabase"
  value        = var.COSMOS_DB
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "cosmoscol" {
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]
  
  name         = "CosmosCollection"
  value        = var.COSMOS_COL
  key_vault_id = azurerm_key_vault.kv.id
}


resource "azurerm_key_vault_secret" "appinsights" {
  
  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "AppInsightsKey"
  value        = azurerm_application_insights.scim.instrumentation_key
  key_vault_id = azurerm_key_vault.kv.id
}

# Key Valut 2
resource "azurerm_key_vault_secret" "appclientid" {

  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "AppClientID"
  value        = var.APP_CLIENT_ID
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "appclientsecret" {

  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "AppClientSecret"
  value        = var.APP_CLIENT_SECRET
  key_vault_id = azurerm_key_vault.kv.id
}


resource "azurerm_key_vault_secret" "tenantid" {

  depends_on = [
    azurerm_key_vault_access_policy.terraform-sp
  ]

  name         = "TenantID"
  value        = var.TENANT_ID
  key_vault_id = azurerm_key_vault.kv.id
}