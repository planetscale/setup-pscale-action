import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

const linuxPackageUrl =
  'https://github.com/planetscale/cli/releases/download/v0.147.0/pscale_0.147.0_linux_amd64.tar.gz'
const darwinPackageUrl =
  'https://github.com/planetscale/cli/releases/download/v0.147.0/pscale_0.147.0_macOS_amd64.tar.gz'
const windowsPackageUrl =
  'https://github.com/planetscale/cli/releases/download/v0.147.0/pscale_0.147.0_windows_amd64.zip'

async function run(): Promise<void> {
  try {
    let packageUrl = ''
    if (process.platform === 'win32') {
      packageUrl = windowsPackageUrl
    } else if (process.platform === 'darwin') {
      packageUrl = darwinPackageUrl
    } else {
      packageUrl = linuxPackageUrl
    }

    const downloadedPackagePath = await tc.downloadTool(packageUrl)
    const extractedFolder = await tc.extractTar(
      downloadedPackagePath,
      'tools/pscale'
    )

    const packagePath = await tc.cacheDir(extractedFolder, 'pscale', '0.147.0')
    core.addPath(packagePath)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
