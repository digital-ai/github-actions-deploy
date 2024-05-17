const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DeployManager {

  static async apiRequest(serverConfig, endpoint, method, data, headers) {
    const { url, username, password } = serverConfig;
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
      console.error(`Error with ${method.toUpperCase()} request to ${endpoint}:`, error);
      throw error;
    }
  }

  static async publishPackage(serverConfig, packageFullPath) {
    const packageName = path.basename(packageFullPath);
    try {
      const fileData = fs.readFileSync(packageFullPath);
      const formData = new FormData();
      const blob = new Blob([fileData], { type: 'application/octet-stream' });
      formData.append('fileData', blob, packageName);

      const headers = {'Content-Type': 'multipart/form-data'};

      const endpoint = `/deployit/package/upload/${packageName}`;
      const method = 'POST';

      const response = await DeployManager.apiRequest(serverConfig, endpoint, method, formData, headers);

      console.log(`Package ${packageName} published successfully!`);
      return response;

    } catch (error) {
      console.error(`Error publishing package ${packageName}:`, error);
      throw error;
    }
  }

}

module.exports = DeployManager;
