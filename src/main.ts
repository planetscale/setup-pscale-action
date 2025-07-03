import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import axios from 'axios';

const linuxPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_linux_amd64.tar.gz'
const darwinPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_macOS_amd64.tar.gz'
const windowsPackageUrl =
  'https://github.com/planetscale/cli/releases/download/{{VERSION}}/pscale_{{VERSION2}}_windows_amd64.zip'

async function getLatestReleaseVersion(githubToken?: string): Promise<string> {
  const apiUrl = `https://api.github.com/repos/planetscale/cli/releases/latest`;
  const headers: Record<string, string> = {};

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const response = await axios.get(apiUrl, { headers });
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
    const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;

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
      latestVersion = await getLatestReleaseVersion(githubToken);
      core.debug(`latest version: ${latestVersion}`);
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, latestVersion)
        .replace(/{{VERSION2}}/g, latestVersion.replace(/^v/, ''));
    } else {
      packageUrl = packageUrl
        .replace(/{{VERSION}}/g, version)
        .replace(/{{VERSION2}}/g, version.replace(/^v/, ''));
    }

    core.debug(`package url: ${packageUrl}`);

    const auth = githubToken ? `Bearer ${githubToken}` : undefined;
    const downloadedPackagePath = await tc.downloadTool(packageUrl, undefined, auth);
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
