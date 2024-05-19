const fs = require("fs");
const xml2js = require("xml2js");

class Util {

    // Get version from manifest file
    static async getVersionFromManifest(manifestPath) {
        const text = fs.readFileSync(manifestPath, "utf8");
        return await Util.getVersion(text);
    }

    // Get version from manifest content
    static async getVersion(manifest) {
        const xml = await this.xml2json(manifest);

        const udmDeploymentPackageElement = xml["udm.DeploymentPackage"];
        const udmProvisioningPackageElement = xml["udm.ProvisioningPackage"];

        if (udmDeploymentPackageElement) {
            return udmDeploymentPackageElement.$.version;
        } else if (udmProvisioningPackageElement) {
            return udmProvisioningPackageElement.$.version;
        } else {
            throw new Error("Content is not a valid manifest content.");
        }
    }

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

    // Get application from manifest file
    static async getApplicationFromManifest(manifestPath) {
        const manifest = fs.readFileSync(manifestPath, "utf8");
        return await Util.getApplication(manifest);
    }

    // Get application from manifest content
    static async getApplication(manifest) {
        const xml = await this.xml2json(manifest);

        const udmDeploymentPackageElement = xml["udm.DeploymentPackage"];
        const udmProvisioningPackageElement = xml["udm.ProvisioningPackage"];

        if (udmDeploymentPackageElement) {
            return udmDeploymentPackageElement.$.application.trim();
        } else if (udmProvisioningPackageElement) {
            return udmProvisioningPackageElement.$.application.trim();
        } else {
            throw new Error(`Content is not a valid manifest content.`);
        }
    }

    // Get application name from manifest file
    static async getApplicationNameFromManifest(manifestPath) {
        const application = await this.getApplicationFromManifest(manifestPath);
        const splitPath = application.split("/");
        return splitPath[splitPath.length - 1];
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