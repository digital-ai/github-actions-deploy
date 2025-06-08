# 🚀 Digital.ai Deploy GitHub Actions

This GitHub Action automates the creation, publishing, and deployment of packages on Digital.ai Deploy. It facilitates seamless integration between your GitHub repository and Digital.ai Deploy, streamlining your deployment management processes.

## ✨ Features

- **Create**: Generate a new DAR package from a specified manifest file.
- **Publish**: Upload a DAR package to Digital.ai Deploy.
- **Deploy**: Deploy the package to a specified environment.

## 📦 Example Usage

```yaml
name: Create Publish and Deploy Package

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:

      - name: Create Publish and Deploy Package
        id: deploy
        uses: digital-ai/github-actions-deploy@v1.0.0
        with:
          serverUrl: ${{ vars.SERVERURL }}
          username: ${{ secrets.USERNAME }}
          password: ${{ secrets.PASSWORD }}
          manifestPath: '/your-manifest.xml'
          action: 'create_publish_deploy'
          outputPath: '/outputdar'
          versionNumber: '1.0.0'
          packageName: 'appForAction-1.0.0.dar'
          environmentId: 'Environments/envForAction'
          rollback: 'true'
 ```
## ⚠️ Important Note

During execution, this action creates a temporary directory named **`tmp-dai`** in the working directory. This folder is used internally for processing the `deployit-manifest.xml` file. If the action is used in multiple steps within the **same job**, the `tmp-dai` folder **will be** deleted and recreated in each step. This ensures clean isolation and avoids conflicts between steps.

## 🛠️ Supported actions

1. **create**  
2. **publish**  
3. **deploy**  
4. **create_publish**  
5. **publish_deploy**  
6. **create_publish_deploy** 

## 🔧 Inputs

### 🔁 Common

| Name        | Description                                                 | Required | Default |
|-------------|-------------------------------------------------------------|----------|---------|
| `serverUrl` | URL of your Digital.ai Deploy server (e.g., `https://deploy.example.com`). | Yes      | N/A     |
| `username`  | Username for Digital.ai Deploy authentication.              | Yes      | N/A     |
| `password`  | Password for Digital.ai Deploy authentication. | Yes      | N/A     |
| `action`    | Specifies the operation(s). One of: `create`, `publish`, `deploy`, `create_publish`, `publish_deploy`, `create_publish_deploy` | No | `create_publish_deploy` |

---

### 🧱 1. Action = `create`

Generates a new DAR package from a manifest file.

| Name           | Description                                                                                                                                                                       | Required | Default            |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|--------------------|
| `manifestPath` | Path to the manifest file (relative to the repository root). <br/>Example: `'/deployit-manifest.xml'`or `'/manifests/my-service.xml'`.                                                               | Yes      | N/A             |
| `outputPath`   | Directory where the generated DAR will be stored (relative to the workspace). <br/>Example: `'/outputdar'`.                                                                          | Yes      | N/A             |
| `versionNumber`| (Optional) Version string to inject into the manifest before packaging. <br/>Example: `'1.0.0'`.                                                                                  | No       | N/A |
| `packageName`  | (Optional) Name of the DAR package to create (must end with `.dar`). <br/>Example: `'myapp-1.0.0.dar'`. <br/>Default is `package.dar`.                                           | No       | `package.dar`      |

**Outputs** :
- `darPackagePath` (string): Relative path to the generated DAR file, e.g., `outputdar/myapp-1.0.0.dar`.

---

### 📤 2. Action = `publish`

Uploads a pre-existing DAR package to Digital.ai Deploy.

| Name             | Description                                                                                                 | Required | Default |
|------------------|-------------------------------------------------------------------------------------------------------------|----------|---------|
| `darPackagePath` | Relative path to the DAR package that will be published. <br/>Example: `'outputdar/myapp-1.0.0.dar'`.           | Yes      | N/A  |

**Outputs**:
- `deploymentPackageId` (string): The unique ID assigned by Digital.ai Deploy to the published package. e.g., `Applications/appForAction/1.0`.

---

### 🚀 3. Action = `deploy`

Deploys a previously published package into a specified environment.

| Name                 | Description                                                                                                     | Required | Default |
|----------------------|-----------------------------------------------------------------------------------------------------------------|----------|---------|
| `deploymentPackageId`| The ID of the DAR package that was returned by the `publish` action (or manually obtained from Digital.ai Deploy). Example: `'Applications/appForAction/1.0'`.| Yes      | N/A  |
| `environmentId`      | The target environment in which to deploy. <br/>Example: `'Environments/Production'`.                           | Yes      | N/A  |
| `rollback`           | (Optional) Whether to automatically trigger a rollback if the deployment fails. <br/>Accepts string values: `'true'` or `'false'`. | No       | `false` |

**Outputs**:
- `deploymentTaskId` (string): ID of the deployment task created by Digital.ai Deploy.  e.g., `677f5322-31ce-43fe-8758-6730c734ba75`.
- `rollbackTaskId` (string): If a rollback is invoked, this will contain the ID of the rollback task; otherwise, this output is empty. e.g., `847f5322-31ce-43fe-8758-6730c734ba58`.

---

### 🧰 4. Action = `create_publish`

Equivalent to running `create` and then `publish` in sequence.  

**Inputs (all required for `create` + `publish`):**

| Name           | Description                                                                                       | Required | Default        |
|----------------|---------------------------------------------------------------------------------------------------|----------|----------------|
| `manifestPath` | Path to manifest file.                                                                  | Yes      | N/A         |
| `outputPath`   | Directory for storing the generated DAR.                                                          | Yes      | N/A         |
| `versionNumber`| (Optional) Version string to set in the manifest.                                                 | No       | N/A         |
| `packageName`  | (Optional) DAR filename (must end with `.dar`).                                                   | No       | `package.dar`  |

(The Action itself takes care of passing the generated DAR into the publish operation.)

**Outputs**:
- `darPackagePath` (string): Path to the DAR created.  
- `deploymentPackageId` (string): ID returned after publishing that DAR.

---

### 🔗 5. Action = `publish_deploy`

Equivalent to running `publish` and then `deploy` in sequence.  

**Inputs (all required for `publish` + `deploy`):**

| Name                 | Description                                                                                                 | Required | Default |
|----------------------|-------------------------------------------------------------------------------------------------------------|----------|---------|
| `darPackagePath`     | Relative path to the existing DAR to publish.                              | Yes      | N/A  |
| `environmentId`      | Target environment for deployment.                                                                            | Yes      | N/A  |
| `rollback`           | (Optional) `'true'` to trigger rollback on failure, `'false'` otherwise.                                     | No       | `false` |

(The published package ID is automatically passed into the `deploy` phase.)

**Outputs**:
- `deploymentPackageId` (string): ID of the published DAR.  
- `deploymentTaskId` (string): ID of the newly created deployment task.  
- `rollbackTaskId` (string): ID of the rollback task if triggered; otherwise blank.

---

### 🛠️ 6. Action = `create_publish_deploy`

Runs **create → publish → deploy** in one continuous flow.  

**Inputs (all required for `create` + `publish` + `deploy`):**

| Name              | Description                                                                                                      | Required | Default        |
|-------------------|------------------------------------------------------------------------------------------------------------------|----------|----------------|
| `manifestPath`    | Path to manifest file.xml`.                                                                                 | Yes      | N/A         |
| `outputPath`      | Directory where the DAR will be generated.                                                                       | Yes      | N/A         |
| `versionNumber`   | (Optional) Version string to set in the manifest.                                                                | No       | N/A         |
| `packageName`     | (Optional) Desired DAR filename (must end in `.dar`).                                                            | No       | `package.dar`  |
| `environmentId`   | Target environment ID.                                                            | Yes      | N/A         |
| `rollback`        | (Optional) Set to `'true'` to automatically roll back on failure.                                                | No       | `false`        |

**Outputs**:
- `darPackagePath` (string): Path of the created DAR file.  
- `deploymentPackageId` (string): ID of the published DAR.  
- `deploymentTaskId` (string): ID of the deployment task.  
- `rollbackTaskId` (string): ID of any rollback task if triggered; otherwise empty.

---

## 🗂️ Summary of Inputs & Outputs

| **Action Mode**           | **Required Inputs**                                                                                                                                                                    | **Optional Inputs**                    | **Outputs**                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| **create**                | `serverUrl`, `username`, `password`, `action=create`, `manifestPath`, `outputPath`                                                                                                      | `versionNumber`, `packageName`         | `darPackagePath`                                                                                                     |
| **publish**               | `serverUrl`, `username`, `password`, `action=publish`, `darPackagePath`                                                                                                                  | —                                      | `deploymentPackageId`                                                                                                |
| **deploy**                | `serverUrl`, `username`, `password`, `action=deploy`, `deploymentPackageId`, `environmentId`                                                                                              | `rollback`                             | `deploymentTaskId`, `rollbackTaskId`                                                                                  |
| **create_publish**        | `serverUrl`, `username`, `password`, `action=create_publish`, `manifestPath`, `outputPath`                                                                                                | `versionNumber`, `packageName`         | `darPackagePath`, `deploymentPackageId`                                                                               |
| **publish_deploy**        | `serverUrl`, `username`, `password`, `action=publish_deploy`, `darPackagePath`, `environmentId`                                                                                            | `rollback`                             | `deploymentPackageId`, `deploymentTaskId`, `rollbackTaskId`                                                            |
| **create_publish_deploy** | `serverUrl`, `username`, `password`, `action=create_publish_deploy`, `manifestPath`, `outputPath`, `environmentId`                                                                       | `versionNumber`, `packageName`, `rollback` | `darPackagePath`, `deploymentPackageId`, `deploymentTaskId`, `rollbackTaskId`                                        |

---

## Example project 

An example repository using this action : <a href="https://github.com/digital-ai/github-actions-deploy-demo" target="_blank">github-actions-deploy-demo</a>



