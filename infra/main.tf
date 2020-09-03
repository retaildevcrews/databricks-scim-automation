# Resources needed:
#     App Service
#     Web App for containers
#     Key Vault
#     Application Insights
#     ACR
#     Cosmos DB (MVP2) - listing here so it is considered in design
#  --->>>  Function App ??


provider "azurerm" {
  version = "~>2.0"
  features {}

  subscription_id = var.TF_SUB_ID
  client_id       = var.TF_CLIENT_ID
  client_secret   = var.TF_CLIENT_SECRET
  tenant_id       = var.TF_TENANT_ID
}


# Create Resource Group
resource "azurerm_resource_group" "rg" {
        name = "${var.NAME}-rg"
        location = var.LOCATION
}


module "db" {
  source           = "./db"
  NAME             = var.NAME
  LOCATION         = var.LOCATION
  #----------------COSMOS_RG_NAME   = azurerm_resource_group.cosmos.name
  APP_RG_NAME         = azurerm_resource_group.rg.name
  COSMOS_RU        = var.COSMOS_RU
  COSMOS_DB        = var.COSMOS_DB
  COSMOS_COL       = var.COSMOS_COL
}



module "web" {
  source = "./webapp"
  NAME                = var.NAME
  LOCATION            = var.LOCATION
  APP_RG_NAME         = azurerm_resource_group.rg.name
  TENANT_ID           = var.TF_TENANT_ID
  COSMOS_KEY          = module.db.ro_key
  DB_CREATION_DONE    = module.db.DB_CREATION_DONE

  APP_SERVICE_DONE    = module.web.APP_SERVICE_DONE
  
  # -------------------------COSMOS_RG_NAME      = azurerm_resource_group.cosmos.name

  COSMOS_DB           = var.COSMOS_DB
  COSMOS_COL          = var.COSMOS_COL
  COSMOS_URL          = "https://${var.NAME}.documents.azure.com:443/"
}
