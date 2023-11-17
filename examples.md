## GitHub Actions `pscale` examples

Use these examples to build your own workflows using `pscale` and GitHub Actions.

### Authenticate with service tokens
To authenticate with the PlanetScale API, you will need to [create a service token](https://planetscale.com/docs/concepts/service-tokens).

Make sure to give your service token the proper permissions to the database you'll be using in your workflow.

Add your ID and secret to your Actions secrets.

### Install pscale CLI on GitHub Actions.
Having access to pscale within actions will allow you to script workflows. Use the `setup-pscale-action` to install it within your workflows.

```yaml
- name: Setup pscale
  uses: planetscale/setup-pscale-action@v1
```

This action works for Linux, Windows & Mac. It will also place `pscale` into your tool cache to keep subsequent runs fast.

### Using pscale
Once `pscale` is installed, you can use it by setting service token environment variables.

```yaml
- name: Use pscale
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    pscale deploy-request list my-db --org my-org
```

### Convert GitHub branch name to PlanetScale branch name

PlanetScale branch names must be lowercase, alphanumeric characters and hyphens are allowed.

Since git branch names allow more possibilities, we can use the following code to transform a git branch name into an acceptable PlanetScale branch name.

```yaml
- name: Rename branch name
  run:  echo "PSCALE_BRANCH_NAME=$(echo ${{ github.head_ref }} | tr -cd '[:alnum:]-'| tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV
```

This makes `${{ env.PSCALE_BRANCH_NAME }}` available for use in the rest of the workflow.

### Create a PlanetScale branch
You can use `pscale` to create a branch that matches your GitHub branch name.

```yaml
- name: Create branch
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    set +e
    pscale branch show ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }}
    exit_code=$?
    set -e

    if [ $exit_code -eq 0 ]; then
      echo "Branch exists. Skipping branch creation."
    else
      echo "Branch does not exist. Creating."
      pscale branch create ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} --wait
    fi
```

Notice that we first check if the branch exists. If it does, we do nothing. Otherwise we create it and pass the `--wait` flag.

This is useful when running in CI, as the workflow may run multiple times and you'll want the branch ready if you are running schema migrations immediately after creating the branch.

### Get deploy request by branch name
We can use `pscale deploy-requests show` to grab the latest deploy request by branch name.

```yaml
- name: Get Deploy Requests
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    deploy_request_number=$(pscale deploy-request show ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} -f json | jq -r '.number')
    echo "DEPLOY_REQUEST_NUMBER=$deploy_request_number" >> $GITHUB_ENV
```

This example also makes the deploy request number available as an `env` var.


### Get deploy request diff and comment on PR

This will grab the `diff` from the deploy request and write it to a local text file.

Then, this text file will be used as a comment on the pull request.

```yaml
- name: Comment on PR
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    echo "Deploy request opened: https://app.planetscale.com/${{ secrets.PLANETSCALE_ORG_NAME }}/${{ secrets.PLANETSCALE_DATABASE_NAME }}/deploy-requests/${{ env.DEPLOY_REQUEST_NUMBER }}" >> migration-message.txt
    echo "" >> migration-message.txt
    echo "\`\`\`diff" >> migration-message.txt
    pscale deploy-request diff ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.DEPLOY_REQUEST_NUMBER }}  -f json | jq -r '.[].raw' >> migration-message.txt
    echo "\`\`\`" >> migration-message.txt
- name: Comment PR - db migrated
  uses: thollander/actions-comment-pull-request@v2
  with:
    filePath: migration-message.txt
```

### Submit a deploy request by branch name

To trigger a deploy, we can use `pscale deploy-request deploy`. This command will accept either the deploy request number, or the branch name.

When using with GitHub Actions, it's often easier to use the branch name.

The `--wait` flag will let the command run until the deployment is complete. This is important if you want your schema change to run before the next step in your workflow.

```yaml
- name: Deploy schema migrations
  env:
    PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
    PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
  run: |
    pscale deploy-request deploy ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} --wait --org ${{ secrets.PLANETSCALE_ORG_NAME }}

```

### Full example of running migrations for a Rails application
This workflow will run whenever a pull request is opened with changes in `db/schema.rb`.

The Rails application must have the [`planetscale_rails`](https://github.com/planetscale/planetscale_rails) gem setup for this workflow to work.

It will create a branch, run `rails db:migrate` against the branch, open a deploy request and then comment the diff on the PR.

```yaml
name: Run database migrations
on: 
  pull_request:
    branches: [ main ]
    paths:
      - 'db/schema.rb'

jobs:
  planetscale:
    permissions: 
      pull-requests: write
      contents: read

    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v3
      - name: Set branch name
        run:  echo "PSCALE_BRANCH_NAME=$(echo ${{ github.head_ref }} | tr -cd '[:alnum:]-'| tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV
      - name: Create branch
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
        run: |
          set +e
          pscale branch show ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }}
          exit_code=$?
          set -e
      
          if [ $exit_code -eq 0 ]; then
            echo "Branch exists. Skipping branch creation."
          else
            echo "Branch does not exist. Creating."
            pscale branch create ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} --wait
          fi
      - uses: actions/checkout@v3
      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2.1
      - name: Cache Ruby gems
        uses: actions/cache@v3
        with:
          path: vendor/bundle
          key: ${{ runner.os }}-gems-${{ hashFiles('**/Gemfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-gems-
      - name: Install dependencies
        run: |
          bundle config --local path vendor/bundle
          bundle config --local deployment true
          bundle install
      - name: Set migration config
        run: |
          echo "org: ${{ secrets.PLANETSCALE_ORG_NAME }}" > .pscale.yml
          echo "database: ${{ secrets.PLANETSCALE_DATABASE_NAME }}" >> .pscale.yml
          echo "branch: ${{ env.PSCALE_BRANCH_NAME }}" >> .pscale.yml
      - name: Setup pscale
        uses: planetscale/setup-pscale-action@v1
      - name: Run migrations
        run: |
          bundle exec rails psdb:migrate > migration-output.txt
        env:
          PSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
      - name: Open DR if migrations
        run: |
          if grep -q "migrated" migration-output.txt; then
            echo "DB_MIGRATED=true" >> $GITHUB_ENV
            if pscale deploy-request create ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }}; then
              cat migration-output.txt
              echo "DR_OPENED=true" >> $GITHUB_ENV
              echo "Deploy request successfully opened"
            else
              echo "Error: Deployment request failed"
              exit 0
            fi
          else
            echo "Did not open a DR since nothing found in migration-output.txt"
            cat migration-output.txt
            exit 0
          fi
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
      - name: Get Deploy Requests
        if: ${{ env.DR_OPENED }}
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
        run: |
          deploy_request_number=$(pscale deploy-request show ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} -f json | jq -r '.number')
          echo "DEPLOY_REQUEST_NUMBER=$deploy_request_number" >> $GITHUB_ENV
      - name: Comment PR - db migrated
        if: ${{ env.DR_OPENED }}
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
        run: |
          sleep 2
          echo "Deploy request opened: https://app.planetscale.com/${{ secrets.PLANETSCALE_ORG_NAME }}/${{ secrets.PLANETSCALE_DATABASE_NAME }}/deploy-requests/${{ env.DEPLOY_REQUEST_NUMBER }}" >> migration-message.txt
          echo "" >> migration-message.txt
          echo "\`\`\`diff" >> migration-message.txt
          pscale deploy-request diff ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.DEPLOY_REQUEST_NUMBER }}  -f json | jq -r '.[].raw' >> migration-message.txt
          echo "\`\`\`" >> migration-message.txt
      - name: Comment PR - db migrated
        uses: thollander/actions-comment-pull-request@v2
        if: ${{ env.DR_OPENED }}
        with:
          filePath: migration-message.txt
```

### Full example of running migrations and deploying to Fly.io

This workflow will check for any open deploy requests for the `head` branch whenever a pull request is closed.

If there are any, it will run the deploy request before moving on to the last step. In this example, we deploy a Rails application to Fly after running migrations successfully.

```yaml
name: Fly Deploy
on:
  pull_request:
    types:
      - closed
  workflow_dispatch:

jobs:
  deploy:
    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.merged == true
    name: Deploy app
    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v3
      - name: Setup pscale
        uses: planetscale/setup-pscale-action@v1
      - name: Set branch name
        run:  echo "PSCALE_BRANCH_NAME=$(echo ${{ github.head_ref }} | tr -cd '[:alnum:]-'| tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV
      - name: Get Deploy Requests
        if: github.event.pull_request.merged == true
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
        run: |
          deploy_request_number=$(pscale deploy-request show ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.PSCALE_BRANCH_NAME }} --org ${{ secrets.PLANETSCALE_ORG_NAME }} -f json | jq -r '.number')
          echo "DEPLOY_REQUEST_NUMBER=$deploy_request_number" >> $GITHUB_ENV

      - name: Deploy schema migrations
        if: ${{ env.DEPLOY_REQUEST_NUMBER }}
        env:
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANETSCALE_SERVICE_TOKEN_ID }}
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANETSCALE_SERVICE_TOKEN }}
        run: |
          pscale deploy-request deploy ${{ secrets.PLANETSCALE_DATABASE_NAME }} ${{ env.DEPLOY_REQUEST_NUMBER }} --wait --org ${{ secrets.PLANETSCALE_ORG_NAME }}
      - name: Setup fly
        uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy to fly
        run: flyctl deploy --remote-only --strategy immediate
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```
