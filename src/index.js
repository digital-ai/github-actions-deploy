const core = require('@actions/core');
const Archive = require('./archive');
const PackageManager = require("./package-manager");


async function createNewPackage(manifestPath, darPath, packageName) {
  return await Archive.CreateNewDarPackage(manifestPath, darPath, packageName);

}

async function publishPackage(serverUrl, username, password, packageFullPath) {
  return await PackageManager.publishPackage(serverUrl, username, password, packageFullPath);

}

async function run() {
  try {
    // Read all inputs 
    const action = core.getInput('action');
    const serverUrl = core.getInput('serverUrl');
    const username = core.getInput('username');
    const password = core.getInput('password');
    const manifestPath = core.getInput('manifestPath');
    const darPath = core.getInput('darPath');
    const packageName = core.getInput('packageName');
    const existingDarPath = core.getInput('existingDarPath');
    const packageId = core.getInput('packageId');
    const environmentId = core.getInput('environmentId');

    // Assign default value for action
    const defaultAction = 'create_publish_deploy';
    const selectedAction = action || defaultAction;

    // Check action and validate inputs accordingly
    if (selectedAction === 'create') {
      
      if (!manifestPath || !darPath) {
        throw new Error("manifestPath and darPath are required for 'create' action.");
      }
      await createNewPackage(manifestPath, darPath, packageName);

    } else if (selectedAction === 'create_publish') {
      
      if (!manifestPath || !darPath || !serverUrl || !username || !password) {
        throw new Error("serverUrl, username, password, manifestPath and darPath are required for 'create_publish' action.");
      }

      const packageFullPath = await createNewPackage(manifestPath, darPath, packageName);

      publishPackage(serverUrl, username, password, packageFullPath)


    } else if (selectedAction === 'create_publish_deploy') {
      
      if (!manifestPath || !darPath || !serverUrl || !username || !password || !packageId || !environmentId) {
        throw new Error("manifestPath, darPath, serverUrl, username, password, packageId, and environmentId are required for 'create_publish_deploy' action.");
      }

    } else if (selectedAction === 'publish') {
      
      if (!existingDarPath || !serverUrl || !username || !password) {
        throw new Error("existingDarPath, serverUrl, username, and password are required for 'publish' action.");
      }

    } else if (selectedAction === 'publish_deploy') {
      
      if (!existingDarPath || !serverUrl || !username || !password || !packageId || !environmentId) {
        throw new Error("existingDarPath, serverUrl, username, password, packageId, and environmentId are required for 'publish_deploy' action.");
      }

    } else {
      throw new Error(`Invalid action: ${selectedAction}. Supported actions are: create, create_publish, create_publish_deploy, publish, publish_deploy.`);
    }

  } catch (error) {
    // Handle errors
    core.setFailed(error.message);
  }
}

module.exports = {
  run
}

run();