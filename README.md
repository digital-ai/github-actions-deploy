# Digital.ai Deploy GitHub Actions

This GitHub Action automates the creation, publishing, and deployment of packages on Digital.ai Deploy. It facilitates seamless integration between your GitHub repository and Digital.ai Deploy, streamlining your deployment management processes.

## Features

- **Create**: Generate a new DAR package from a specified manifest file.
- **Publish**: Upload a DAR package to Digital.ai Deploy.
- **Deploy**: Deploy a DAR package to a specified environment.

## Example Usage

```yaml
name: Build and Deploy Package

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:

      - name: Create Publish and Deploy Package
        id: deploy
        uses: digital-ai/github-actions-deploy@main
        with:
          serverUrl: ${{ secrets.SERVERURL }}
          username: ${{ secrets.USERNAME }}
          password: ${{ secrets.PASSWORD }}
          manifestPath: '/deployit-manifest.xml'
          action: 'create_publish_deploy'
          outputPath: '/outputdar'
          versionNumber: ${{ vars.VERSIONNUMBER }}
          packageName: 'appForAction-1.0.dar'
          environmentId: 'Environments/envForAction'
          rollback: 'yes'
 ```
## Example project 

An example repository using this action : <a href="https://github.com/digital-ai/github-actions-deploy-demo" target="_blank">github-actions-deploy-demo</a>


## Inputs

The action supports the following inputs:

| Name            | Description                                                                                                                                                         | Required | Default                 |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|-------------------------|
| `serverUrl`     | The URL of the Digital.ai Deploy server.                                                                                                                            | Yes      |                         |
| `username`      | The username for authenticating with Digital.ai Deploy.                                                                                                             | Yes      |                         |
| `password`      | The password for authenticating with Digital.ai Deploy.                                                                                                             | Yes      |                         |
| `action`        | Action to perform: create, publish, deploy. <br/>Supported actions are:<br/>`create_publish`, `publish_deploy`, `create_publish_deploy`.                            | No       | `create_publish_deploy` |
| `manifestPath`  | The path to the deployit-manifest.xml file. <br/>Example: `/deployit-manifest.xml`                                                                                  | Yes      |                         |
| `outputPath`    | The path for storing the newly created DAR package. <br/>Example: `/outputdar`                                                                                      | Yes      |                         |
| `packageName`   | Optional. The name of the newly created DAR package. <br/>Example: `appForAction-1.0.dar`                                                                           | No       | `package.dar`           |
| `versionNumber` | Optional. Specify a version number to set in your manifest file.  <br/>Example: `1.0`                                                                               | No       |                         |
| `darPackagePath`| The path to the DAR package. Mandatory for publish_deploy action. <br/>Example: `/dar/appForAction-1.0.dar`                                                         | Yes*     |                         |
| `environmentId` | ID of the target environment in Digital.ai Deploy. <br/> Mandatory for `publish_deploy`, `create_publish_deploy` action. <br/> Example: `Environments/envForAction` | Yes*     |                         |
| `rollback`      | Optional. Invoke a rollback in case of deployment failure. <br/>Example: `true`                                                                                     | no       |  `false`                |
