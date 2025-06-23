import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import axios from 'axios';

const linuxPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_linux_amd64.tar.gz'
const darwinPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_macOS_amd64.tar.gz'
const windowsPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_windows_amd64.zip'

async function getLatestReleaseVersion(): Promise<string> {
  const apiUrl = `https://api.github.com/repos/planetscale/cli/releases/latest`;
  const response = await axios.get(apiUrl);
  return response.data.tag_name;
}

function validateVersion(version: string): void {
  const versionPattern = /^v\d+\.\d+\.\d+$/;
  if (version !== 'latest' && !versionPattern.test(version)) {
    throw new Error(`Invalid version format: ${version}. Please use the format "vX.X.X" or "latest". See: https://github.com/planetscale/cli/releases for available releases.`);
  }
}

async function run(): Promise<void> {
  let packageUrl = '';
  try {
    const version = core.getInput('version') || 'latest';
    validateVersion(version);

    core.debug(`requested version: ${version}`);
    if (process.platform === 'win32') {
      packageUrl = windowsPackageUrl;
    } else if (process.platform === 'darwin') {
      packageUrl = darwinPackageUrl;
    } else {
      packageUrl = linuxPackageUrl;
    }

    let latestVersion = '';
    if (version === 'latest') {
      latestVersion = await getLatestReleaseVersion();
      core.debug(`latest version: ${version}`);
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, latestVersion)
        .replace(/{{VERSION2}}/g, latestVersion.replace(/^v/, ''));
    } else {
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, version)
        .replace(/{{VERSION2}}/g, version.replace(/^v/, ''));
    }

    core.debug(`package url: ${packageUrl}`);

    const downloadedPackagePath = await tc.downloadTool(packageUrl);
    const extractedFolder = await tc.extractTar(downloadedPackagePath, 'tools/pscale');

    const packagePath = await tc.cacheDir(extractedFolder, 'pscale', version === 'latest' ? latestVersion : version);

    core.addPath(packagePath);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`pscale was unable to be installed from GitHub. URL: ${packageUrl}. Error: ${error.message}`);
    }
  }
}

run();
