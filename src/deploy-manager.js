const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Util = require('./util');

class DeployManager {

  static serverConfig;

  // General API request method
  static async apiRequest(endpoint, method, data, headers) {
    const { url, username, password } = this.serverConfig;
    try {
      const response = await axios({
        url: `${url}${endpoint}`,
        method,
        headers,
        auth: { username, password },
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

  // Publish a package
  static async publishPackage(packageFullPath) {
    const packageName = path.basename(packageFullPath);
    const fileData = fs.readFileSync(packageFullPath);
    const formData = new FormData();
    formData.append('fileData', fileData, packageName);

    const headers = formData.getHeaders();
    const endpoint = `/deployit/package/upload/${packageName}`;
    const method = 'POST';

    const response = await this.apiRequest(endpoint, method, formData, headers);
    console.log(`Package ${packageName} published successfully! Package ID: ${response.id}`);
    core.setOutput('deploymentPackageId', response.id);
    core.summary
      .addHeading("Package Publish Summary")
      .addList([
        `Package full path: <i>${packageFullPath}</i>`,
        `Package <i>${packageName}</i> published successfully!<br/>`,
        `Package ID: <i>${response.id}</i><br/>`
      ], false)
      .write();
    return response.id;
  }

  // Get server state
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

  // Deploy a package
  static async deployPackage(deploymentPackageId, targetEnvironment, rollback, serverUrl) {
    if (!Util.startsWith(targetEnvironment, "Environments/", true)) {
      targetEnvironment = `Environments/${targetEnvironment}`;
    }

    if (!await this.environmentExists(targetEnvironment)) {
      throw new Error(`Specified environment ${targetEnvironment} doesn't exists.`);
    } else {
      console.log(`Environment ${targetEnvironment} exists.`);
    }

    console.log(`Starting deployment of package Id ${deploymentPackageId} to ${targetEnvironment}`);

    const deploymentTaskId = await this.createDeploymentTask(deploymentPackageId, targetEnvironment);
    console.log(`New deployment task has been successfully created with id ${deploymentTaskId}`);

    const deploymentUrl = `${serverUrl}/#/reports/deployments?taskId=${deploymentTaskId}`;

    core.setOutput('deploymentTaskId', deploymentTaskId);

    await this.startDeploymentTask(deploymentTaskId);
    const taskOutcome = await this.waitForTask(deploymentTaskId);

    if (taskOutcome === "EXECUTED" || taskOutcome === "DONE") {
      // Archive the deployment task
      await this.archiveDeploymentTask(deploymentTaskId);
      const deploymentUrl = `${serverUrl}/#/reports/deployments?taskId=${deploymentTaskId}`;
      core.summary
        .addHeading('Deployment Summary')
        .addList([
          `Deployment package Id: <i>${deploymentPackageId}</i>`,
          `Target environment: <i>${targetEnvironment}</i>`,
          `Deployment task Id: <i>${deploymentTaskId}</i>`,
          `<a href="${deploymentUrl}">View deployment details in Digital.ai Deploy UI</a>`
        ], false)
        .write();
      console.log(`Successfully deployed to ${targetEnvironment}`);
    } else {
      if (taskOutcome === "FAILED") {
        console.log("Deployment failed");
      }
      if (rollback === 'false') {
        const deploymentUrl = `${serverUrl}/#/explorer?taskId=${deploymentTaskId}`;
        core.summary
          .addHeading('Deployment Summary')
          .addList([
            `Deployment package Id: <i>${deploymentPackageId}</i>`,
            `Target environment: <i>${targetEnvironment}</i>`,
            `Deployment task Id: <i>${deploymentTaskId}</i>`,
            `<a href="${deploymentUrl}">View deployment details in Digital.ai Deploy UI</a>`
          ], false);
        throw new Error("Deployment failed");
      }

      console.log("Starting rollback process...");
      const rollbackTaskId = await this.createRollbackTask(deploymentTaskId);
      console.log(`Rollback task created with id ${rollbackTaskId}`);
      core.setOutput('rollbackTaskId', rollbackTaskId);
      await this.startDeploymentTask(rollbackTaskId);

      const deploymentUrl = `${serverUrl}/#/reports/deployments?taskId=${deploymentTaskId}`;
      core.summary
        .addHeading('Deployment Summary')
        .addList([
          `Deployment package Id: <i>${deploymentPackageId}</i>`,
          `Target environment: <i>${targetEnvironment}</i>`,
          `Deployment task Id: <i>${deploymentTaskId}</i>`,
          `<a href="${deploymentUrl}">View deployment details in Digital.ai Deploy UI</a>`
        ], false)
        .write();

      const rollbackTaskOutcome = await this.waitForTask(rollbackTaskId);

      if (rollbackTaskOutcome === "EXECUTED" || rollbackTaskOutcome === "DONE") {
        // Archive the rollback task
        await this.archiveDeploymentTask(rollbackTaskId);
        const rollbackUrl = `${serverUrl}/#/reports/deployments?taskId=${rollbackTaskId}`;
        core.summary
          .addHeading('Rollback Summary')
          .addList([
            `Deployment package Id: <i>${deploymentPackageId}</i>`,
            `Target environment: <i>${targetEnvironment}</i>`,
            `Rollback task Id: <i>${rollbackTaskId}</i>`,
            `<a href="${rollbackUrl}">View rollback details in Digital.ai Deploy UI</a>`
          ], false)
        console.log("Rollback executed successfully");
        throw new Error("Deployment failed - Rollback executed successfully");
      } else {
        const rollbackUrl = `${serverUrl}/#/explorer?taskId=${rollbackTaskId}`;
        core.summary
          .addHeading('Rollback Summary')
          .addList([
            `Deployment package Id: <i>${deploymentPackageId}</i>`,
            `Target environment: <i>${targetEnvironment}</i>`,
            `Rollback task Id: <i>${rollbackTaskId}</i>`,
            `<a href="${rollbackUrl}">View rollback details in Digital.ai Deploy UI</a>`
          ], false);
        console.log("Rollback failed");
        throw new Error("Rollback failed");
      }
    }
  }

  // Check if the environment exists
  static async environmentExists(environmentId) {
    const endpoint = `/deployit/repository/exists/${environmentId}`;
    const headers = { 'Content-Type': 'application/json' };
    const response = await this.apiRequest(endpoint, 'GET', '', headers);
    return response['boolean'];
  }

  // Create deployment task
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

  // Create deployment
  static async createDeployment(deploymentId, targetEnvironment) {
    const splitPath = deploymentId.split("/");
    const applicationName = splitPath[splitPath.length - 2];
    splitPath.pop(); // Remove version
    const applicationFullName = splitPath.join("/");

    if (await this.deploymentExists(applicationFullName, targetEnvironment)) {
      return await this.getDeploymentObject(deploymentId, `${targetEnvironment}/${applicationName}`);
    }
    return await this.getInitialDeployment(deploymentId, targetEnvironment);
  }

  // Prepare deployment
  static async prepareDeployed(deployment) {
    const endpoint = `/deployit/deployment/prepare/deployeds`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, deployment, headers);
  }

  // Validate deployment
  static async validateDeployment(deployment) {
    const endpoint = `/deployit/deployment/validate`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, deployment, headers);
  }

  // Get deployment object
  static async getDeploymentObject(deploymentId, deployedApplication) {
    const deploymentIdEncoded = encodeURIComponent(deploymentId);
    const deployedApplicationEncoded = encodeURIComponent(deployedApplication);

    const endpoint = `/deployit/deployment/prepare/update?version=${deploymentIdEncoded}&deployedApplication=${deployedApplicationEncoded}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, '', headers);
  }

  // Check if deployment exists
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

  // Get initial deployment
  static async getInitialDeployment(deploymentId, targetEnvironment) {
    const deploymentIdEncoded = encodeURIComponent(deploymentId);
    const targetEnvironmentEncoded = encodeURIComponent(targetEnvironment);

    const endpoint = `/deployit/deployment/prepare/initial?version=${deploymentIdEncoded}&environment=${targetEnvironmentEncoded}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    return await this.apiRequest(endpoint, method, '', headers);
  }

  // Start deployment task
  static async startDeploymentTask(deploymentId) {
    const endpoint = `/deployit/tasks/v2/${deploymentId}/start`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    await this.apiRequest(endpoint, method, '', headers);
  }

  // Wait for task to complete
  static async waitForTask(taskId) {
    const runningStates = ["QUEUED", "EXECUTING", "ABORTING", "STOPPING", "FAILING", "PENDING"];
    let task = await this.getDeploymentTask(taskId);

    while (runningStates.indexOf(task.state) > -1) {
      await this.sleepFor(5);
      task = await this.getDeploymentTask(taskId);
    }

    return task.state;
  }

  // Archive deployment task
  static async archiveDeploymentTask(taskId) {
    const endpoint = `/deployit/tasks/v2/${taskId}/archive`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    await this.apiRequest(endpoint, method, '', headers);
  }

  // Get deployment task
  static async getDeploymentTask(taskId) {
    const endpoint = `/deployit/tasks/v2/${taskId}`;
    const method = 'GET';
    const headers = { 'Content-Type': 'application/json' };

    const response = await this.apiRequest(endpoint, method, '', headers);
    return response;
  }

  // Create rollback task
  static async createRollbackTask(taskId) {
    const endpoint = `/deployit/deployment/rollback/${taskId}`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };

    const response = await this.apiRequest(endpoint, method, '', headers);
    return response['string'];
  }

  // Sleep for a given duration
  static sleepFor(sleepDurationInSeconds) {
    return new Promise((resolve) => setTimeout(resolve, sleepDurationInSeconds * 1000));
  }
}

module.exports = DeployManager;