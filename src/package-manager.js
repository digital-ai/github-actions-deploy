const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PackageManager {

  static async publishPackage(serverUrl, username, password, packageFullPath) {
    
    const packageName = path.basename(packageFullPath);

    try {

      const fileData = fs.readFileSync(packageFullPath);
      const formData = new FormData();
      const blob = new Blob([fileData], { type: 'application/octet-stream' });
      formData.append('fileData', blob, packageName);

      const response = await axios.post(`${serverUrl}/deployit/package/upload/${packageName}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        auth: {
          username,
          password
        }
      });

      console.log(`Package ${packageName} published successfully!`);
      return response.data;
      
    } catch (error) {
      console.error(`Error publishing package ${packageName}:`, error);
      throw error;
    }
  }
}

module.exports = PackageManager;
