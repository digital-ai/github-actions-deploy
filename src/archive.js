const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

class Archive {
    // Parse the manifest XML file and extract paths of files to be included in the package
    static async getPathsFromManifest(manifestPath) {
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

    // Create a new DAR package using the manifest file
    static async createNewDarPackage(manifestPath, outputPath, packageName) {
        try {
            const rootPath = process.cwd();
            const manifestFileFullPath = path.join(rootPath, "deployit-manifest.xml");

            // Copy the manifest file to the current working directory
            if (fs.existsSync(manifestFileFullPath)) {
                //console.log("Manifest file already present in staging folder. The current file will be overwritten with the source manifest file.");
            }
            fs.copyFileSync(manifestPath, manifestFileFullPath);

            // Create the output directory if it doesn't exist
            if (path.isAbsolute(outputPath) && !fs.existsSync(outputPath)) {
                console.log(`Output path not found, creating folder structure: ${outputPath}`);
                fs.mkdirSync(outputPath, { recursive: true });
            }

            // Set the package name, ensuring it ends with .dar
            if (!packageName) {
                packageName = "package.dar";
            } else if (!packageName.toLowerCase().endsWith(".dar")) {
                packageName = packageName + ".dar";
            }

            var packageFullPath = path.join(outputPath, packageName);
            console.log(`Package path set: ${packageFullPath}`);

            // Throw an error if a package already exists at the target path
            if (fs.existsSync(packageFullPath)) {
                throw new Error(`A DAR package already exists at ${packageFullPath}.`);
            }

            const filesToInclude = await Archive.getPathsFromManifest(manifestPath);
            console.log(`Files to include in the package = ${filesToInclude}`);

            await Archive.compressPackage(packageFullPath, filesToInclude, rootPath);
            console.log("Package created at:", packageFullPath);
            
            const relativePath = path.relative(process.cwd(), packageFullPath);
            const packageRelativePath = relativePath.startsWith(path.sep)? relativePath : path.sep + relativePath;

            console.log(`Package relative path: ${packageRelativePath}`);

            return packageRelativePath;
        } catch (error) {
            console.error("Error creating package:", error);
            throw error;
        }
    }

    // Compress the files into a DAR package
    static async compressPackage(packageFullPath, filesToInclude, rootPath) {
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
    }
}

module.exports = Archive;