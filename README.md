# DataBricks SCIM Automation

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Description

Create a service principal from a SCIM Connector Gallery App that will sync users in an AAD group to a specified Databricks workspace. Then create and start an initial sync job.

## Features

- Create a single SCIM app and execute initial sync job via CLI
- Create multiple SCIM apps from a CSV and execute all initial sync jobs via CLI
- Create a single SCIM app and execute initial sync job via GUI
- Notes on SCIM sync cadence at [./src/app/README.md > End User Notes](./src/app/README.md#scim-sync-cadence)

## Prerequisites

- Azure subscription with permissions to create:
  - Resource Groups, Service Principals, and Key Vault
- App registration with permissions to use:
  - Microsoft Graph API
  - Databricks API
- Azure CLI or Terraform for Infrastructure
- Node for CLI/GUI 12.18.4+ ([download](https://nodejs.org/en/download/))

## Documentation && Setup

- Infrastructure Setup and Execution: [README.md](./infra/README.md)
- CLI/GUI Setup and Execution: [README.md](./src/app/README.md)


### Validate az CLI works

> In Visual Studio Codespaces, open a terminal by pressing ctl + `

```bash

# make sure you are logged into Azure
az account show

# if not, log in
az login

```

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Microsoft Contributor License Agreement](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
