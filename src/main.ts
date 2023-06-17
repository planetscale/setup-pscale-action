import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

const packageUrl =
  'https://github.com/planetscale/cli/releases/download/v0.147.0/pscale_0.147.0_linux_amd64.tar.gz'

async function run(): Promise<void> {
  try {
    const downloadedPackagePath = await tc.downloadTool(packageUrl)
    const extractedFolder = await tc.extractTar(downloadedPackagePath, 'path/to/extract/to');

    const packagePath = await tc.cacheDir(
      extractedFolder,
      'pscale',
      '0.147.0',
    )

    core.addPath(packagePath);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
