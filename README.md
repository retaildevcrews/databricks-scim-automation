# DataBricks SCIM Automation

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Description

Description of the project ...

## Features

- Feature
- Feature

## Prerequisites

- Azure subscription with permissions to create:
  - Resource Groups, Service Principals, Key Vault, Cosmos DB, Azure Container Registry, Azure Monitor, App Service
- Bash shell (tested on Visual Studio Codespaces, Mac, Ubuntu, Windows with WSL2)
  - Will not work with WSL1 or Cloud Shell
- .NET Core SDK 3.1 ([download](https://dotnet.microsoft.com/download))
- Docker CLI ([download](https://docs.docker.com/install/))
- Azure CLI ([download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest))
- Visual Studio Code (optional) ([download](https://code.visualstudio.com/download))

## Documentation

- Table of contents is at [docs/index.md](docs/index.md)

## Setup

TODO: Add instructions on setting up infrastructure

### Validate az CLI works

> In Visual Studio Codespaces, open a terminal by pressing ctl + `

```bash

# make sure you are logged into Azure
az account show

# if not, log in
az login

```

### Run app locally

```bash

# run the application
# assumes a key vault is created with "AccessToken" secret
# TODO: consider parameterizing
dotnet run -p src/app/databricksscim.csproj -- --auth-type CLI --keyvault-name {insert key vault name}

```

### Test application

Open a new terminal

```bash

# test the application

# test using curl
curl localhost:4120/version

# test dummy endpoint
# TODO: remove/update when graph API calls are integrated
curl localhost:4120/api/SCIM

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
