
#  --------------CosmosDB instance-----------

resource "azurerm_cosmosdb_account" "cosmosdb" {
  name                = var.NAME
  location            = var.LOCATION
  resource_group_name = var.APP_RG_NAME #var.COSMOS_RG_NAME
  kind                = "GlobalDocumentDB"
  offer_type          = "Standard"
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = "5"
    max_staleness_prefix    = "100"
  }
  enable_automatic_failover = false
  geo_location {
    location          = var.LOCATION
    failover_priority = "0"
  }
}


output "ro_key" {
  value       = azurerm_cosmosdb_account.cosmosdb.primary_readonly_master_key
  sensitive   = true
  description = "The read Only key for the CosmosDB to be used by the Application. This is used to pass into the webapp module"
}



# ---->>>>  Create a Database
resource "azurerm_cosmosdb_sql_database" "cosmosdb-testDB" {
  name                = var.COSMOS_DB
  resource_group_name = var.APP_RG_NAME #var.COSMOS_RG_NAME
  account_name        = azurerm_cosmosdb_account.cosmosdb.name
  throughput          = var.COSMOS_RU

}

# ---->>>> Creating Collections

resource "azurerm_cosmosdb_sql_container" "cosmosdb-items" {
  name                = var.COSMOS_COL
  resource_group_name = var.APP_RG_NAME #var.COSMOS_RG_NAME
  account_name        = azurerm_cosmosdb_account.cosmosdb.name
  database_name       = azurerm_cosmosdb_sql_database.cosmosdb-testDB.name
  partition_key_path  = "/partitionKey"
}


output "DB_CREATION_DONE" {
  depends_on  = [azurerm_cosmosdb_account.cosmosdb]
  value       = true
  description = "Cosmos Db creatiom complete"
}


