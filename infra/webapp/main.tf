#----------------------------------------------------------------------------
#  -App Service Plan and App Service  

resource "azurerm_app_service_plan" "app-plan" {
  name                = "${var.NAME}-plan"
  location            = var.LOCATION
  resource_group_name = var.APP_RG_NAME

  #kind                = "linux"  ??
  #reserved            = true ??

  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_app_service" "web-app" {


 depends_on = [
    var.DB_CREATION_DONE,
    azurerm_application_insights.scim
  ]
  

  name               = var.NAME
  location            = var.LOCATION
  resource_group_name = var.APP_RG_NAME
  https_only          = false
  app_service_plan_id = azurerm_app_service_plan.app-plan.id

  site_config {
    always_on                 = "true"
    dotnet_framework_version = "v4.0"
    scm_type                 = "LocalGit" #GitHub instead ?
  }

  identity {
     type = "SystemAssigned"
   } 

  logs {
    http_logs {
      file_system {
        retention_in_days = 30
        retention_in_mb   = 100
      }
    }
  } 

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "true"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "true"
    "KEYVAULT_NAME"                       = "${var.NAME}-kv"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = "${azurerm_application_insights.scim.instrumentation_key}"
  
  }
  tags = {
    environment = "development"
  }

}
output "APP_SERVICE_DONE" {
  depends_on  = [azurerm_app_service.web-app]
  value       = true
  description = "App Service setup is complete"
}

#---------------------------------------------------------------------------

