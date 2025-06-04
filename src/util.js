const fs = require("fs");
const xml2js = require("xml2js");

class Util {

    // Check if input string starts with a specific value
    static startsWith(inputString, value, ignoreCase) {
        const subString = inputString.substring(0, value.length);

        if (ignoreCase) {
            return subString.toLowerCase() === value.toLowerCase();
        } else {
            return subString === value;
        }
    }

    // Set version in the manifest file
    static async setVersion(manifestPath, version) {
        const text = fs.readFileSync(manifestPath, "utf8");
        const xml = await this.xml2json(text);

        const udmDeploymentPackageElement = xml["udm.DeploymentPackage"];
        const udmProvisioningPackageElement = xml["udm.ProvisioningPackage"];

        if (udmDeploymentPackageElement) {
            udmDeploymentPackageElement.$.version = version;
        } else if (udmProvisioningPackageElement) {
            udmProvisioningPackageElement.$.version = version;
        } else {
            throw new Error(`${manifestPath} is not a valid manifest file.`);
        }

        const builder = new xml2js.Builder();
        fs.writeFileSync(manifestPath, builder.buildObject(xml), "utf8");
        
    }

    // Convert XML to JSON
    static async xml2json(xml) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xml, { explicitArray: false }, (err, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(json);
                }
            });
        });
    }
}

module.exports = Util;