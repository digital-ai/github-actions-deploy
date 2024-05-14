const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

class Archive {
    
    static async GetPathsFromManifest(manifestPath) {
        const manifest = fs.readFileSync(manifestPath, "utf8");
        const xml = await new Promise((resolve, reject) => {
            xml2js.parseString(manifest, { explicitArray: false }, (err, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(json);
                }
            });
        });

        const filesToInclude = new Set(["deployit-manifest.xml"]);
        const deployables = xml["udm.DeploymentPackage"].deployables;

        for (const deployable in deployables) {
            if (deployables[deployable].hasOwnProperty("$") && deployables[deployable].$.hasOwnProperty("file")) {
                filesToInclude.add(deployables[deployable].$.file);
            } else {
                if (deployables[deployable] instanceof Array) {
                    for (const element of deployables[deployable]) {
                        if (element.hasOwnProperty("$") && element.$.hasOwnProperty("file")) {
                            filesToInclude.add(element.$.file);
                        }
                    }
                }
            }
        }

        return Array.from(filesToInclude);
    }

    static async CreateNewDarPackage(manifestPath, outputPath, packageName) {
        const rootPath = process.cwd()

        console.log(`rootPath = ${rootPath}`);
        console.log(`manifestPath = ${manifestPath}`);
        console.log(`outputPath = ${outputPath}`);
        console.log(`packageName = ${packageName}`);

        const manifestFileFullPath = path.join(rootPath, "deployit-manifest.xml");

        if (fs.existsSync(manifestFileFullPath)) {
            console.log("Manifest file already present in staging folder. The current file will be overwritten with the source manifest file.");
        }
    
        fs.copyFileSync(manifestPath, manifestFileFullPath);

        const outputFullPath = path.join(process.cwd(), outputPath)

        if (path.isAbsolute(outputFullPath) && !fs.existsSync(outputFullPath)) {
            console.log(`Output path not found, creating folder structure: ${outputFullPath}`);
            fs.mkdirSync(outputFullPath, { recursive: true });
        }

        if (packageName && !packageName.toLowerCase().endsWith(".dar")) {
            packageName = packageName + ".dar";
        } else {
            packageName = "package.dar";
        }

        const packageFullPath = path.join(outputFullPath, packageName);

        console.log(`Package path set: ${packageFullPath}`);

        if (fs.existsSync(packageFullPath)) {
            throw new Error(`A DAR package already exists at ${packageFullPath}.`);
        }

        const filesToInclude = await Archive.GetPathsFromManifest(manifestPath);

        console.log(`filesToInclude = ${filesToInclude}`);

        return await Archive.CompressPackage(packageFullPath, filesToInclude, rootPath);
    }

    static async CompressPackage(packageFullPath, filesToInclude, rootPath) {
        const archive = archiver("zip", {});
        const output = fs.createWriteStream(packageFullPath);

        archive.pipe(output);

        for (const entry of filesToInclude) {
            const fullyEntryPath = path.join(rootPath, entry);

            if (fs.statSync(fullyEntryPath).isDirectory()) {
                archive.directory(fullyEntryPath, entry);
            } else {
                archive.append(fs.createReadStream(fullyEntryPath), { name: entry });
            }
        }

        await new Promise((resolve, reject) => {
            output.on("close", resolve);
            archive.on("error", reject);

            archive.finalize();
        });

        return packageFullPath;
    }
}

module.exports = Archive;
