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
          versionNumber: '1.0'
          packageName: 'appForAction-1.0.dar'
          environmentId: 'Environments/envForAction'
          rollback: 'true'
```

## ⚠️ Important Note

During execution, this action creates a temporary directory named **`tmp-dai`** in the working directory. This folder is used internally for processing the `deployit-manifest.xml` file. If the action is used in multiple steps within the **same job**, the `tmp-dai` folder **will be** deleted and recreated in each step. This ensures clean isolation and avoids conflicts between steps.

## 🧪 Example Project

An example repository using this action:  
🔗 <a href="https://github.com/digital-ai/github-actions-deploy-demo" target="_blank">github-actions-deploy-demo</a>

## 🛠️ Supported Actions

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
| `password`  | Password for Digital.ai Deploy authentication.              | Yes      | N/A     |
| `action`    | Specifies the operation(s). One of: `create`, `publish`, `deploy`, `create_publish`, `publish_deploy`, `create_publish_deploy` | No | `create_publish_deploy` |

---

### 🧱 1. Action = `create`

| Name           | Description                                 | Required | Default         |
|----------------|---------------------------------------------|----------|-----------------|
| `manifestPath` | Path to the `deployit-manifest.xml` file    | Yes      | N/A             |
| `outputPath`   | Directory to store the generated DAR        | Yes      | N/A             |
| `versionNumber`| Optional version string to inject           | No       | N/A             |
| `packageName`  | Optional name of DAR file (ends in `.dar`)  | No       | `package.dar`   |

**Outputs**:
- **`darPackagePath`**

---

### 📤 2. Action = `publish`

| Name             | Description                             | Required | Default |
|------------------|-----------------------------------------|----------|---------|
| `darPackagePath` | Path to the existing DAR file           | Yes      | N/A     |

**Outputs**:
- **`deploymentPackageId`**

---

### 🚀 3. Action = `deploy`

| Name                 | Description                             | Required | Default |
|----------------------|-----------------------------------------|----------|---------|
| `deploymentPackageId`| ID of the package to deploy             | Yes      | N/A     |
| `environmentId`      | Target environment ID                   | Yes      | N/A     |
| `rollback`           | Accepts string values: `'true'` or `'false'` | No       | `'false'` |

**Outputs**:
- **`deploymentTaskId`**  
- **`rollbackTaskId`**

---

### 🧰 4. Action = `create_publish`

**Inputs**: All from `create` + `publish`  

**Outputs**:
- **`darPackagePath`**  
- **`deploymentPackageId`**

---

### 🔗 5. Action = `publish_deploy`

**Inputs**: All from `publish` + `deploy`  

**Outputs**:
- **`deploymentPackageId`**  
- **`deploymentTaskId`**  
- **`rollbackTaskId`**

---

### 🛠️ 6. Action = `create_publish_deploy`

**Inputs**: All from `create` + `publish` + `deploy`  

**Outputs**:
- **`darPackagePath`**  
- **`deploymentPackageId`**  
- **`deploymentTaskId`**  
- **`rollbackTaskId`**

---

## 🗂️ Summary of Inputs & Outputs

| **Action**              | **Required Inputs**                                                                 | **Optional Inputs**                      | **Outputs**                                          |
|--------------------------|-------------------------------------------------------------------------------------|------------------------------------------|------------------------------------------------------|
| `create`                 | `serverUrl`, `username`, `password`, `manifestPath`, `outputPath`                  | `versionNumber`, `packageName`           | **`darPackagePath`**                                 |
| `publish`                | `serverUrl`, `username`, `password`, `darPackagePath`                              | –                                        | **`deploymentPackageId`**                            |
| `deploy`                 | `serverUrl`, `username`, `password`, `deploymentPackageId`, `environmentId`        | `rollback`                               | **`deploymentTaskId`**, **`rollbackTaskId`**         |
| `create_publish`         | All from `create`                                                                  | All from `create`                         | **`darPackagePath`**, **`deploymentPackageId`**      |
| `publish_deploy`         | All from `publish` + `deploy`                                                      | `rollback`                                | **`deploymentPackageId`**, **`deploymentTaskId`**, **`rollbackTaskId`** |
| `create_publish_deploy`  | All from `create` + `publish` + `deploy`                                           | `versionNumber`, `packageName`, `rollback` | **`darPackagePath`**, **`deploymentPackageId`**, **`deploymentTaskId`**, **`rollbackTaskId`** |
