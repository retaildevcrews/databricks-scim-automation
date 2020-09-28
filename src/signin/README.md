# Implementing @databricks-scim-automation/signin

- Install dependencies: `npm install`
- Import library in code that triggers sign-in: `const signin = require('@databricks-scim-automation/signin')`
- Pass in callback triggered after signin: `signin.SigninApp((code) => { /* Excute after signin */ })` 
