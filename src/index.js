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
    throw new Error(`Manifest file not found at: ${manifestFullPath}`);
  }
  core.debug(`Manifest full path: ${manifestFullPath}`);

  const rootPath = process.cwd();
  const tmpDir = path.join(rootPath, 'tmp-dai');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tmpDir);

  const tmpManifestPath = path.join(tmpDir, 'deployit-manifest.xml');
  fs.copyFileSync(manifestFullPath, tmpManifestPath);
  core.debug(`Copied original manifest from '${manifestFullPath}' to temporary manifest at '${tmpManifestPath}'`);

  const outputFullPath = path.join(process.cwd(), outputPath);
  core.debug(`Output full path for package: ${outputFullPath}`);



  if (versionNumber) {
    Util.setVersion(tmpManifestPath, versionNumber);
    core.debug(`Updated version number '${versionNumber}' in manifest at '${tmpManifestPath}'`);
  }

  return Archive.createNewDarPackage(tmpManifestPath, outputFullPath, packageName);
}

async function publishPackage(packageFullPath) {
  if (!packageFullPath.endsWith(".dar")) {
    throw new Error("Invalid package path: the path must have a '.dar' extension.");
  }

  if (!fs.existsSync(packageFullPath)) {
    throw new Error(`Package DAR file not found at: ${packageFullPath}`);
  }

  return DeployManager.publishPackage(packageFullPath);
}

async function deployPackage(deploymentPackageId, targetEnvironment, rollback) {
  return DeployManager.deployPackage(deploymentPackageId, targetEnvironment, rollback);
}

async function run() {
  try {
    // Define action constants for better readability and to prevent typos    
    const ACTIONS = {
      CREATE: 'create',
      PUBLISH: 'publish',
      DEPLOY: 'deploy',
      CREATE_PUBLISH: 'create_publish',
      PUBLISH_DEPLOY: 'publish_deploy',
      CREATE_PUBLISH_DEPLOY: 'create_publish_deploy'
    };

    // Read all inputs
    const action = core.getInput('action') || 'create_publish_deploy';
    const serverUrl = core.getInput('serverUrl').replace(/\/$/, ''); // Remove trailing '/'
    const username = core.getInput('username');
    const password = core.getInput('password');
    const manifestPath = core.getInput('manifestPath');
    const outputPath = core.getInput('outputPath');
    const packageName = core.getInput('packageName');
    const versionNumber = core.getInput('versionNumber');
    const darPackagePathInput = core.getInput('darPackagePath'); // Renamed to avoid conflict with local variable
    const deploymentPackageIdInput = core.getInput('deploymentPackageId'); // Renamed to avoid conflict with local variable
    const environmentId = core.getInput('environmentId');
    const rollback = core.getInput('rollback') || 'false';

    core.info(`Action requested: ${action}`);

    // Validate core server connection inputs
    if (!serverUrl || !username || !password) {
      throw new Error('serverUrl, username, and password are required for all actions.');
    }

    // Set server configuration for DeployManager
    DeployManager.serverConfig = { url: serverUrl, username: username, password: password };
    core.debug(`Server URL: ${serverUrl}`);

    // Verify connection to Digital.ai Deploy server
    core.info('Verifying connection to Digital.ai Deploy server...');
    const serverState = await DeployManager.getServerState();
    if (serverState !== "RUNNING") {
      throw new Error("Digital.ai Deploy server not reachable. Address or credentials are invalid or server is not in a running state.");
    } else {
      core.info('Digital.ai Deploy server is running and credentials are validated.');
    }

    const validateInputs = (requiredInputs) => {
      requiredInputs.forEach(input => {
        if (!core.getInput(input)) {
          throw new Error(`Input '${input}' is required for action '${action}'.`);
        }
      });
    };

    let packageRelativePath, packageFullPath, deploymentPackageId;
    switch (action) {
      
      case ACTIONS.CREATE:
        validateInputs(['manifestPath', 'outputPath']);
        core.info(`Inputs for 'create' action: manifestPath=${manifestPath}, outputPath=${outputPath}`);
        packageRelativePath = await createNewPackage(manifestPath, outputPath, packageName, versionNumber);
        core.setOutput('darPackagePath', packageRelativePath);
        break;

      case ACTIONS.PUBLISH:
        validateInputs(['darPackagePath']);
        core.info(`Inputs for 'publish' action: darPackagePath=${darPackagePathInput}`);
        packageFullPath = path.join(process.cwd(), darPackagePathInput);
        deploymentPackageId = await publishPackage(packageFullPath);
        core.setOutput('deploymentPackageId', deploymentPackageId);
        break
      
        case ACTIONS.DEPLOY:
        validateInputs(['deploymentPackageId', 'environmentId']);
        core.info(`Inputs for 'deploy' action: deploymentPackageId=${deploymentPackageIdInput}, environmentId=${environmentId}`);
        await deployPackage(deploymentPackageIdInput, environmentId, rollback);
        break;

      case ACTIONS.CREATE_PUBLISH:
        validateInputs(['manifestPath', 'outputPath']);
        core.info(`Inputs for 'create_publish' action: manifestPath=${manifestPath}, outputPath=${outputPath}`);
        packageRelativePath = await createNewPackage(manifestPath, outputPath, packageName, versionNumber);
        core.setOutput('darPackagePath', packageRelativePath);

        packageFullPath = path.join(process.cwd(), packageRelativePath);
        deploymentPackageId = await publishPackage(packageFullPath);
        core.setOutput('deploymentPackageId', deploymentPackageId);
        break;

      case ACTIONS.PUBLISH_DEPLOY:
        validateInputs(['darPackagePath', 'environmentId']);
        core.info(`Inputs for 'publish_deploy' action: darPackagePath=${darPackagePathInput}, environmentId=${environmentId}`);
        packageFullPath = path.join(process.cwd(), darPackagePathInput);
        deploymentPackageId = await publishPackage(packageFullPath);
        core.setOutput('deploymentPackageId', deploymentPackageId); 

        await deployPackage(deploymentPackageId, environmentId, rollback);
        break;

      case ACTIONS.CREATE_PUBLISH_DEPLOY:
        validateInputs(['manifestPath', 'outputPath', 'environmentId']);
        core.info(`Inputs for 'create_publish_deploy' action: manifestPath=${manifestPath}, outputPath=${outputPath}, environmentId=${environmentId}`);
        packageRelativePath = await createNewPackage(manifestPath, outputPath, packageName, versionNumber);
        core.setOutput('darPackagePath', packageRelativePath);

        packageFullPath = path.join(process.cwd(), packageRelativePath);
        deploymentPackageId = await publishPackage(packageFullPath);
        core.setOutput('deploymentPackageId', deploymentPackageId);

        await deployPackage(deploymentPackageId, environmentId, rollback); 
        break;

      default:
        throw new Error(`Invalid action: ${action}. Supported actions are: ${Object.values(ACTIONS).join(', ')}.`);
    }
  } catch (error) {
    
    core.setFailed(error.message);
    core.summary
      .addHeading('🚨Action Failed')
      .addSeparator()
      .addCodeBlock(error.stack || error.message)
      .write();
  }
}

module.exports = {
  run
};

run();