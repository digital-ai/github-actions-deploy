const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Util = require('./util');
const Zip = require('./zip');

class DeployManager {

  static serverConfig;

  static async apiRequest(endpoint, method, data, headers) {
    const { url, username, password } = this.serverConfig;
    try {
      const response = await axios({
        url: `${url}${endpoint}`,
        method,
        headers,
        auth: {
          username,
          password
        },
        data
      });
      return response.data;
    } catch (error) {
      const statusCode = error.response ? error.response.status : 'No response';
      const errorData = error.response ? error.response.data : error.message;
      console.error(`Error with ${method.toUpperCase()} request to ${endpoint}: Status Code: ${statusCode}, Data:`, errorData);
      throw new Error(`Request failed with status ${statusCode}: ${JSON.stringify(errorData)}`);
    }
  }

  static async publishPackage(packageFullPath) {

    const packageName = path.basename(packageFullPath);
    const fileData = fs.readFileSync(packageFullPath);
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    formData.append('fileData', blob, packageName);
    const headers = { 'Content-Type': 'multipart/form-data' };
    const endpoint = `/deployit/package/upload/${packageName}`;
    const method = 'POST';

    const response = await this.apiRequest(endpoint, method, formData, headers);
    console.log(`Package ${packageName} published successfully!`);
    return response;
  }

  static async getServerState() {
    try {
      const endpoint = '/deployit/server/state';
      const headers = { 'Content-Type': 'application/json' };
      const response = await this.apiRequest(endpoint, 'GET', '', headers);
      return response['current-mode'];

    } catch (error) {
      return 'UNREACHABLE';
    }
  }

  static async deployPackage(packageFullPath, targetEnvironment, rollback) {

    if (!Util.StartsWith(targetEnvironment, "Environments/", true)) {
      targetEnvironment = `Environments/${targetEnvironment}`;
    }

    if (!await this.environmentExists(targetEnvironment)) {
      throw new Error(`Specified environment ${targetEnvironment} doesn't exists.`);
    }

    const manifest = await Zip.GetManifestFromPackage(packageFullPath);
    const application = await Util.GetApplication(manifest);
    const version = await Util.GetVersion(manifest);
    const deploymentPackageId = `Applications/${application}/${version}`;

    console.log(`Package name is ${deploymentPackageId}`)
    console.log(`Starting deployment to ${targetEnvironment}.`);

    const deploymentId = await this.createDeploymentTask(deploymentPackageId, targetEnvironment);
    console.log(`New deployment task has been successfully created with id ${deploymentId}.`);

    await this.startDeploymentTask(deploymentId)
    const taskOutcome = await this.waitForTask(deploymentId);
    if (taskOutcome === "EXECUTED" || taskOutcome === "DONE") {
      // archive
      await this.archiveDeploymentTask(deploymentId);
      console.log(`Successfully deployed to ${targetEnvironment}.`);
    } else {

      if (taskOutcome === "FAILED") {
        console.log("Deployment failed");
      }
      if (!rollback) {
        throw new Error("Deployment failed");
      }

      console.log("Starting rollback.");
      const rollbackTaskId = await this.createRollbackTask(deploymentId);
      await this.startDeploymentTask(rollbackTaskId);
      const rollbackTaskOutcome = await this.waitForTask(rollbackTaskId);

      if (rollbackTaskOutcome === "EXECUTED" || rollbackTaskOutcome === "DONE") {
        // archive
        await this.archiveDeploymentTask(rollbackTaskId);
        console.log("Deployment failed - Rollback executed successfully.");
      } else {
        throw new Error("Rollback failed.");
      }

    }
  }

  static async environmentExists(environmentId) {
    const endpoint = `/deployit/repository/exists/${environmentId}`;
    const headers = { 'Content-Type': 'application/json' };
    const response = await this.apiRequest(endpoint, 'GET', '', headers);
    return response['boolean'];
  }

  static async createDeploymentTask(deploymentPackageId, targetEnvironment) {
    let deployment = await this.createDeployment(deploymentPackageId, targetEnvironment);
    deployment = await this.prepareDeployed(deployment);
    deployment = await this.validateDeployment(deployment);

    const endpoint = `/deployit/deployment/`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    const task = await this.apiRequest(endpoint, method, deployment, headers);
    return task['string'];
  }

  static async createDeployment(deploymentId, targetEnvironment) {
    const splitPath = deploymentId.split("/");
    const applicationName = splitPath[splitPath.length - 2];
    splitPath.pop(); // remove version
    const applicationFullName = splitPath.join("/");

    if (await this.deploymentExists(applicationFullName, targetEnvironment)) {
      return await this.getDeploymentObject(deploymentId, `${targetEnvironment}/${applicationName}`);
    }
    return await this.getInitialDeployment(deploymentId, targetEnvironment);
  }

  static async prepareDeployed(deployment) {
    const endpoint = `/deployit/deployment/prepare/deployeds`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, deployment, headers);
  }

  static async validateDeployment(deployment) {
    const endpoint = `/deployit/deployment/validate`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, deployment, headers);
  }

  static async getDeploymentObject(deploymentId, deployedApplication) {
    const deploymentIdEncoded = encodeURIComponent(deploymentId);
    const deployedApplicationEncoded = encodeURIComponent(deployedApplication);

    const endpoint = `/deployit/deployment/prepare/update?version=${deploymentIdEncoded}&deployedApplication=${deployedApplicationEncoded}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, '', headers);

  }

  static async deploymentExists(application, environment) {
    const subString = application.substring(0, "Applications/".length);

    if (subString.toLocaleLowerCase() !== "applications/") {
      application = "Applications/" + application;
    }

    const applicationEncoded = encodeURIComponent(application);
    const environmentEncoded = encodeURIComponent(environment);

    const endpoint = `/deployit/deployment/exists?application=${applicationEncoded}&environment=${environmentEncoded}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    const response = await this.apiRequest(endpoint, method, '', headers);
    return response['boolean'];
  }


  static async getInitialDeployment(deploymentId, targetEnvironment) {
    const deploymentIdEncoded = encodeURIComponent(deploymentId);
    const targetEnvironmentEncoded = encodeURIComponent(targetEnvironment);

    const endpoint = `/deployit/deployment/prepare/initial?version=${deploymentIdEncoded}&environment=${targetEnvironmentEncoded}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, '', headers);
  }

  static async startDeploymentTask(deploymentId) {
    const endpoint = `/deployit/tasks/v2/${deploymentId}/start`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    await this.apiRequest(endpoint, method, '', headers);
  }

  static async waitForTask(taskId) {
    const runningStates = ["QUEUED", "EXECUTING", "ABORTING", "STOPPING", "FAILING", "PENDING"];
    let task = await this.getDeploymentTask(taskId);

    while (runningStates.indexOf(task.state) > -1) {
      await this.sleepFor(5);
      task = await this.getDeploymentTask(taskId);
    }

    return task.state;
  }

  static async archiveDeploymentTask(taskId) {
    const endpoint = `/deployit/tasks/v2/${taskId}/archive`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    await this.apiRequest(endpoint, method, '', headers);
  }

  static async getDeploymentTask(taskId) {
    const endpoint = `/deployit/tasks/v2/${taskId}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    const response = await this.apiRequest(endpoint, method, '', headers);
    return response;
  }

  static async createRollbackTask(taskId) {
    const endpoint = `/deployit/deployment/rollback/${taskId}`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    const response = await this.apiRequest(endpoint, method, '', headers);
    return response['string'];
  }

  static sleepFor(sleepDurationInSeconds) {
    return new Promise((resolve) => setTimeout(resolve, sleepDurationInSeconds * 1000));
  }
}

module.exports = DeployManager;
