const StreamZip = require("node-stream-zip");

class Zip {
    
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
