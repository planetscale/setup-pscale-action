# Setup `pscale` Action

Use this Action to install `pscale` on your actions runner. Works with Linux, Mac and Windows runners.

```
- name: Setup pscale
  uses: planetscale/setup-pscale-action@main
  with:
    version: v0.147.0
- name: Use pscale
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    pscale deploy-request list my-db --org my-org
```

Setting the `version` is optional. When omitted, the action will download the latest version.

Be sure to [setup a service token](https://planetscale.com/docs/concepts/service-tokens) with the proper permissions and add it to your repositories secrets.

## Development

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run package
```
