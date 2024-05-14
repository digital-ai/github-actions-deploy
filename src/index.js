const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
const { parseString } = require('xml2js');

async function run() {
  try {
    // Get inputs
    let manifestPath = core.getInput('manifestPath');

    // Read XML file
    const xmlData = fs.readFileSync(manifestPath, 'utf8');

    // Parse XML to JavaScript object
    parseString(xmlData, (err, result) => {
      if (err) {
        throw new Error(`Error parsing XML: ${err.message}`);
      }

      // Print parsed XML content
      console.log(JSON.stringify(result, null, 2));
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