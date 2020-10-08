# Implementing @databricks-scim-automation/signin

- Install dependencies: `npm install`
- Import library in code that triggers signin: `const signin = require('@databricks-scim-automation/signin')`
- Intialize Construstor: `const signinApp = new signin.SigninApp();`
- Pass in callback triggered after signin: `signinApp.setCallback(code) => { /* Excute after signin */ })`
- Get sign in code from URL and call callback: `signinApp.start()`
