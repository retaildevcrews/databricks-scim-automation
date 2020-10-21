# Databricks SCIM Automation App

## Prerequisites

- Infrastructure set up as instructed in the [main readme](../../README.md)
- Node 12.18.4+ ([download](https://nodejs.org/en/download/))
- At least one instance created of:
  - Azure Databricks
  - a non-empty AAD Group created

## Setup

Install required npm packages

```bash

# make sure you are in the /src/app directory
cd ./src/app

# install packages
npm install

# you may see the following output, it is expected and safe to ignore
# npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.1.3 (node_modules/@databricks-scim-automation/graph/node_modules/fsevents)
# npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.1.3: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})
# npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.1.3 (node_modules/fsevents):
# npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.1.3: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})

# this is safe to ignore as well as it does not impact the functionality of the unit tests
# npm WARN chai-fetch-mock@3.0.0 requires a peer of fetch-mock@5.1.x || 6.x but none is installed. You must install peer dependencies yourself.

```

## Required Inputs

The following is a list of the required inputs for the CLI App:

- SCIM App Name = Display name of the SCIM Connector App to be created
- AAD Group = Display name of the (already existing) AAD group to sync to the Azure Databricks instance
- Owner Email 1 = Email address of user to be set as first owner of the SCIM Connector App
- Owner Email 2 = Email address of user to be set as second owner of the SCIM Connector App (must be different than Owner 1)
- Databricks Url = Databricks Url (format: https://adb-*.*.azuredatabricks.net)

> Note:
>
> - There is no restriction on creating multiple SCIM Connector Apps with the same display name, they will have different objectIds.
> - If there is more than one AAD group with the same name, will use the first one returned from the API.

## Run the App

### Run CLI app with single command line input

```bash

# start the app
npm start

# you will be prompted for each input
# note that the values for the gallery app template id and sync job template id both default to values for Azure Databricks
# just hit enter to accept the default value

```

#### Run CLI app with single command line input for development

```bash

# start the app
npm run dev:cli

```

### Run CLI app with batched input (csv file)

```bash

# create a csv file with the following headers: SCIM App Name,AAD Group,Owner Email 1,Owner Email 2,Databricks Url
# there is a syncs.csv file in ./csv-templates which can be used as a starting point

# you can update the name of the input file if desired
export SCIM_InputFile=inputs.csv

cp ./csv-templates/syncs.csv ./$SCIM_InputFile

# update the created input file with row entries below the header row
# order is important and each value is required

# start the app
npm start ./$SCIM_InputFile

# find completed logs at ./outputs/$SCIM_InputFile
# a status of n/a indicates that the step was not executed because a previous step in the sync failed

```

#### Run CLI app with batched input (csv file) for development

```bash

# set up input file as described above

# create mocks folder (if it does not already exist)
mkdir mocks
# copy input file to ./mocks/syncs.csv
cp ./$SCIM_InputFile ./mocks/syncscsv

# start the app for development
npm run dev:csv

# find completed logs at ./outputs/syncs.csv

```

### Run GUI

> Note: The GUI version of the app was originally used for exploratory purposes and is not guaranteed to be in a stable state.

```bash

# run the GUI
npm run start:gui

# navigate to localhost:1337 (or which ever port was specified in the .env file)

# fill in inputs with ** beside them

```

## End User Notes

- If the application fails to complete a sync process, there are currently no compensating actions. This means manual cleanup of resources is required.
- Notes on SCIM Sync Cadence: [Provisioning Tips](https://docs.microsoft.com/en-us/azure/databricks/administration-guide/users-groups/scim/aad#provisioning-tips)
