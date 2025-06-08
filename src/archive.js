const core = require('@actions/core');
const archiver = require("archiver");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const xml2js = require("xml2js");
const Util = require('./util');

class Archive {
    // Parse the manifest XML file and extract paths of files to be included in the package
    static async getPathsFromManifest(manifestPath) {
        const manifest = await fsp.readFile(manifestPath, "utf8");
        const xml = await new Promise((resolve, reject) => {
            xml2js.parseString(manifest, { explicitArray: false }, (err, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(json);
                }
            });
        });

        const filesToInclude = new Set([`deployit-manifest.xml`]);
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
    static async createNewDarPackage(manifestPath, outputPath, packageName, versionNumber) {
        try {

            const rootPath = process.cwd();
            const tmpDir = path.join(rootPath, 'tmp-dai');
            try {
                await fsp.access(tmpDir);
                core.info(`Temporary directory already exists: ${tmpDir}. Removing it...`);
                await fsp.rm(tmpDir, { recursive: true, force: true });
            } catch {
                // not present, no cleanup needed
            }
            core.info(`Creating temporary directory for manifest : ${tmpDir}`);
            await fsp.mkdir(tmpDir);

            const tmpManifestPath = path.join(tmpDir, 'deployit-manifest.xml');
            await fsp.copyFile(manifestPath, tmpManifestPath);
            core.info(`Copied original manifest from '${manifestPath}' to temporary manifest at '${tmpManifestPath}'`);

            if (versionNumber) {
                await Util.setVersion(tmpManifestPath, versionNumber);
                core.info(`Updated version number '${versionNumber}' in manifest at '${tmpManifestPath}'`);
            } else {
                core.info(`No version number provided, skipping version update in manifest at '${tmpManifestPath}'`);
            }

            // Create the output directory if it doesn't exist
            try {
                await fsp.access(outputPath);
                core.info(`Output path already exists: ${outputPath}`);
            } catch {
                core.info(`Output path not found, creating folder structure: ${outputPath}`);
                await fsp.mkdir(outputPath, { recursive: true });
            }

            // Set the package name, ensuring it ends with .dar
            if (!packageName) {
                core.info("No package name provided, using default 'package.dar'");
                packageName = "package.dar";
            } else if (!packageName.toLowerCase().endsWith(".dar")) {
                packageName = packageName + ".dar";
            }

            const packageFullPath = path.join(outputPath, packageName);
            core.info(`Package path set: ${packageFullPath}`);

            // Throw an error if a package already exists at the target path
            try {
                await fsp.access(packageFullPath);
                throw new Error(`A DAR package already exists at ${packageFullPath}.`);
            } catch {
                // file doesn't exist — OK to proceed
            }

            const filesToInclude = await Archive.getPathsFromManifest(manifestPath);
            core.info(`Files to include in the package = ${filesToInclude}`);

            core.info('Creating DAR package with the following parameters:');
            await Archive.compressPackage(packageFullPath, filesToInclude, rootPath);
            core.info(`Package created at: ${packageFullPath}`);

            const packageRelativePath = path.relative(process.cwd(), packageFullPath);

            core.setOutput('darPackagePath', packageRelativePath);
            await core.summary
                .addHeading("Package Creation Summary")
                .addList([
                    `Input manifest full path: <i>${manifestPath}</i>`,
                    `Package name: <i>${packageName}</i>`,
                    `Package version: <i>${versionNumber || 'taken from input manifest file'}</i>`,
                    `Package created successfully at <i>${packageRelativePath}</i><br/>`
                ], false)
                .write();

            return packageRelativePath;

        } catch (error) {
            core.info("Error in creating the DAR package....");
            throw error;
        }
    }

    // Compress the files into a DAR package
    static async compressPackage(packageFullPath, filesToInclude, rootPath) {
        const archive = archiver("zip", {});
        const output = fs.createWriteStream(packageFullPath);

        archive.pipe(output);

        for (const entry of filesToInclude) {
            
            let fullyEntryPath;
            if (entry === "deployit-manifest.xml") {
                fullyEntryPath = path.join(rootPath, "tmp-dai", entry);
            } else {
                fullyEntryPath = path.join(rootPath, entry);
            }
            core.info(`Adding entry: ${entry} from path: ${fullyEntryPath}`);

            try {
                await fsp.access(fullyEntryPath);
            } catch {
                throw new Error(`File not found: ${fullyEntryPath}`);
            }
            const stats = await fsp.stat(fullyEntryPath);
            if (stats.isDirectory()) {
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