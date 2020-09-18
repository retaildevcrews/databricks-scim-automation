# Graph Dependency

## Installation

* Install the `graph-wrapper` directory dependencies
  * `npm install`
* Set environmental variables
  * Copy `.env-sample` and rename `.env`
  * Update required variables `TENANT_ID`, `APP_SERVICE_CLIENT_ID`, `APP_SERVICE_CLIENT_SECRET`
  * Update optional variables `DATABRICKS_PAT`

## Use

* Wraps Microsoft Graph APIs in an executable function for easy of use
* Provides an array of steps in the order of execution to syncronize a Databricks Workspace with an AAD group

```js
import Promise from 'bluebird';
import graph from '@databricks-scim-automation/graph';

const syncSteps = graph.getSyncSteps();

const params = {};

const callbacks = {
  postAccessToken: async(response) => {
    if (response.status !== 200) {
      throw new Error('Unable to create access token.');
    }
    const body = await response.json();
    params.accessToken = body.access_token; // Assign to params since needed in subsequent calls
  },
  ...
};

// Can execute using mapSeries and async callbacks
Promise.mapSeries(({ key, fn }) => fn(params, callbacks[key]));
```
