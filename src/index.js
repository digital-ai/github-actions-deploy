const core = require('@actions/core');
const path = require("path");
const fs = require("fs");
const Archive = require('./archive');
const DeployManager = require('./deploy-manager');
const Util = require('./util');

async function createNewPackage(manifestPath, outputPath, packageName, versionNumber) {

  if (!manifestPath.endsWith(".xml")) {
    throw new Error("Invalid manifest path: the path must have a '.xml' extension.");
  }
  const manifestFullPath = path.join(process.cwd(), manifestPath);

  if (!fs.existsSync(manifestFullPath)) {
    throw new Error("manifest file does not exist.");
  }

  const outputFullPath = path.join(process.cwd(), outputPath);
  if (versionNumber) {
    Util.SetVersion(manifestFullPath, versionNumber);
  }

  return Archive.CreateNewDarPackage(manifestFullPath, outputFullPath, packageName);
}

async function publishPackage(packageFullPath) {

  if (!packageFullPath.endsWith(".dar")) {
    throw new Error("Invalid package path: the path must have a '.dar' extension.");
  }

  if (!fs.existsSync(packageFullPath)) {
    throw new Error("package dar file does not exist.");
  }

  return DeployManager.publishPackage(packageFullPath);
}

async function run() {
  try {
    // Read all inputs
    const action = core.getInput('action') || 'create_publish_deploy';
    const serverUrl = core.getInput('serverUrl').replace(/\/$/, ''); // Remove trailing '/'
    const username = core.getInput('username');
    const password = core.getInput('password');
    const manifestPath = core.getInput('manifestPath');
    const outputPath = core.getInput('outputPath');
    const packageName = core.getInput('packageName');
    const versionNumber = core.getInput('versionNumber');
    const darPackagePath = core.getInput('darPackagePath');
    const environmentId = core.getInput('environmentId');
    const rollback = core.getInput('rollback');
    var packageFullPath = '';

    if (!serverUrl || !username || !password) {
      throw new Error('serverUrl, username, and password are required.');
    }

    const serverConfig = {
      url: serverUrl,
      username: username,
      password: password
    };

    DeployManager.serverConfig = serverConfig;

    const validateInputs = (requiredInputs) => {
      requiredInputs.forEach(input => {
        if (!core.getInput(input)) {
          throw new Error(`${input} is required for action '${action}'.`);
        }
      });
    };

    switch (action) {
      case 'create_publish':
        validateInputs(['manifestPath', 'outputPath']);
        packageFullPath = await createNewPackage(manifestPath, outputPath, packageName, versionNumber);
        await publishPackage(packageFullPath);
        break;

      case 'publish_deploy':
        validateInputs(['darPackagePath', 'environmentId']);
        packageFullPath = path.join(process.cwd(), darPackagePath);
        await publishPackage(packageFullPath);
        // Add deployment logic here if needed
        break;

      case 'create_publish_deploy':
        validateInputs(['manifestPath', 'outputPath', 'environmentId']);
        packageFullPath = await createNewPackage(manifestPath, outputPath, packageName, versionNumber);
        await publishPackage(packageFullPath);
        // Add deployment logic here if needed
        break;

      default:
        throw new Error(`Invalid action: ${action}. Supported actions are: create_publish, publish_deploy, create_publish_deploy.`);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = {
  run
};

run();
