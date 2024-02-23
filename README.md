# PlanetScale CLI for GitHub Actions

Use this Action to install `pscale` on your actions runner. Works with Linux, Mac and Windows runners.

```yaml
- name: Setup pscale
  uses: planetscale/setup-pscale-action@v1
- name: Use pscale
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    pscale deploy-request list my-db --org my-org
```

Be sure to [setup a service token](https://planetscale.com/docs/concepts/service-tokens) with the proper permissions and add it to your repositories secrets.

**Example with version pinned:**

Setting the `version` is optional. When omitted, the action will download the latest version. [See full list of releases](https://github.com/planetscale/cli/releases).

```yaml
- name: Setup pscale
  uses: planetscale/setup-pscale-action@v1
  with:
    version: v0.183.0
```

## Examples
See our [PlanetScale + GitHub Actions doc](https://planetscale.com/docs/devops/github-actions) for ideas on how to use `pscale` in your Actions Workflows.

## Development

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run package
```

## License

The action is available as open source under the terms of the [Apache 2.0 License](https://opensource.org/license/apache-2-0/).
