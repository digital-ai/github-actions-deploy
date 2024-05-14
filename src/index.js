const core = require('@actions/core');
const axios = require('axios');
const Archive = require('./archive');


async function run() {
  try {
    // Get inputs
    let manifestPath = core.getInput('manifestPath');

    Archive.CreateNewDarPackage(manifestPath, "output", "mydar")
    .then(packagePath => console.log("Package created at:", packagePath))
    .catch(error => {
        console.error("Error creating package:", error);
        throw error; // Throw the error for further handling
    });

  } catch (error) {
    // Handle errors
    core.setFailed(error.message);
  }
}

module.exports = {
  run
}

run();