import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import axios from 'axios';

const linuxPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION}}_linux_amd64.tar.gz'
const darwinPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION}}_macOS_amd64.tar.gz'
const windowsPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION}}_windows_amd64.zip'

async function getLatestReleaseVersion(): Promise<string> {
  const apiUrl = `https://api.github.com/repos/planetscale/cli/releases/latest`;
  const response = await axios.get(apiUrl);
  return response.data.tag_name;
}

async function run(): Promise<void> {
  try {
    const version = core.getInput('version') || 'latest';

    core.debug(`requested version: ${version}`);

    let packageUrl = '';
    if (process.platform === 'win32') {
      packageUrl = windowsPackageUrl;
    } else if (process.platform === 'darwin') {
      packageUrl = darwinPackageUrl;
    } else {
      packageUrl = linuxPackageUrl;
    }

    if (version === 'latest') {
      const latestVersion = await getLatestReleaseVersion();
      core.debug(`latest version: ${version}`);
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, latestVersion)
        .replace(/v(\d+\.\d+\.\d+)/, '$1');
    } else {
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, version)
        .replace(/v(\d+\.\d+\.\d+)/, '$1');
    }

    core.debug(`package url: ${packageUrl}`);

    const downloadedPackagePath = await tc.downloadTool(packageUrl);
    const extractedFolder = await tc.extractTar(downloadedPackagePath, 'tools/pscale');

    const packagePath = await tc.cacheDir(extractedFolder, 'pscale', version);
    core.addPath(packagePath);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
