const fs = require("fs");
const xml2js = require("xml2js");

class Util {

    static async parseXml(xml) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xml, { explicitArray: false }, (err, json) => {
                if (err) reject(err);
                else resolve(json);
            });
        });
    }

    static buildXml(obj) {
        const builder = new xml2js.Builder();
        return builder.buildObject(obj);
    }

    static async setVersion(manifestPath, version) {
        const text = await fs.promises.readFile(manifestPath, "utf8");
        const xmlObj = await Util.parseXml(text);

        const udmDeployment = xmlObj["udm.DeploymentPackage"];
        const udmProvisioning = xmlObj["udm.ProvisioningPackage"];

        if (udmDeployment) {
            udmDeployment.$.version = version;
        } else if (udmProvisioning) {
            udmProvisioning.$.version = version;
        } else {
            throw new Error(
                `${manifestPath} is not a supported manifest file; ` +
                `only <udm.DeploymentPackage> or <udm.ProvisioningPackage> are allowed.`
            );
        }

        const newXml = Util.buildXml(xmlObj);
        await fs.promises.writeFile(manifestPath, newXml, "utf8");
    }
}

module.exports = Util;