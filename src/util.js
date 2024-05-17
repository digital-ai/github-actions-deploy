const fs = require("fs");
const xml2js = require("xml2js");

class Util {

    static async GetVersionFromManifest(manifestPath) {
        const text = fs.readFileSync(manifestPath, "utf8");
        return await Util.GetVersion(text);
    }

    static async GetVersion(manifest) {
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

    static StartsWith(inputString, value, ignoreCase) {
        const subString = inputString.substring(0, value.length);

        if (ignoreCase) {
            return subString.toLowerCase() === value.toLowerCase();
        } else {
            return subString === value;
        }
    }

    static async SetVersion(manifestPath, version) {
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

    static async GetApplicationFromManifest(manifestPath) {
        const manifest = fs.readFileSync(manifestPath, "utf8");
        return await Util.GetApplication(manifest);
    }

    static async GetApplication(manifest) {
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

    static async GetApplicationNameFromManifest(manifestPath) {
        const application = await this.GetApplicationFromManifest(manifestPath);
        const splitPath = application.split("/");
        return splitPath[splitPath.length - 1];
    }

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
