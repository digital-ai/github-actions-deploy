const StreamZip = require("node-stream-zip");

class Zip {
    
    //Extracts the 'deployit-manifest.xml' from the provided zip package.
     
    static async getManifestFromPackage(packagePath) {
        const zip = await Zip.openStreamZip(packagePath);

        try {
            const data = zip.entryDataSync("deployit-manifest.xml");
            return data.toString("utf8");
        } catch (error) {
            if (error === "Entry not found") {
                throw new Error("Manifest file not found inside the deployment package.");
            } else {
                throw new Error(error);
            }
        } finally {
            zip.close();
        }
    }

    // Opens a zip file using StreamZip.
    
    static async openStreamZip(zipFile) {
        const params = {
            file: zipFile,
            skipEntryNameValidation: true,
            storeEntries: true
        };

        const zip = new StreamZip(params);

        return new Promise((resolve, reject) => {
            zip.on("error", reject);
            zip.on("ready", () => { resolve(zip); });
        });
    }
}

module.exports = Zip;
