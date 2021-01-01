# Linter-Maintainer
 
Suitable the linters for your style

## Usage

### 1. Install

```sh
npm install -g linter-maintainer
```

### 2. Execute

#### 3.1 If you want to generate configfile such as `.eslintrc.json`

```sh
linter-maintainer --generate --eslint-js ./your/project/path > .eslintrc.json
```

#### 3.2 If you want to get recommended rules

```sh
$ linter-maintainer --eslint-js ./your/project/path

error  symbol-description is available it should be added
error  template-curly-spacing is available it should be added
error  template-tag-spacing is available it should be added
error  unicode-bom is available it should be added
error  valid-jsdoc is available it should be added
error  wrap-iife is available it should be added
error  wrap-regex is available it should be added
error  yield-star-spacing is available it should be added
error  yoda is available it should be added
error  no-fallthrough is ignored it should be removed
error  no-redeclare is ignored it should be removed
error  no-sparse-arrays is ignored it should be removed
error  no-undef is ignored it should be removed
error  no-unused-vars is ignored it should be removed

157 rules are available 5 rules are ignored 
Total: 162
```

#### 3.3 If you want to check rules by pull request

1. make `.github/workflows/linter-maintainer.yml` on your project

```yml
name: "Linter-Maintainer test"
on: # rebuild any PRs and main branch changes
  pull_request:
  push:
    branches:
      - master
jobs:
  devreplay:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install linter-maintainer
      - uses: actions/setup-node@v1
        with:
          node-version: "12.x"
      - run: echo "::add-matcher::.github/linter-maintainer-match.json"   
      - name: Run linter-maintainer
        run: node_modules/.bin/linter-maintainer ./src
```

2. make `.github/linter-maintainer-match.json`

```json
{
    "problemMatcher": [
        {
            "owner": "linter-maintainer",
            "pattern": [
                {
                    "regexp": "^(warning|error)\\s+(.+)\\s+is.+",
                    "severity": 1,
                    "message": 2
                }
            ]
        }
    ]
}
```

3. Push your source code on the GitHub
4. Check `Actions` button on your GitHub project
5. You'll get warnings [example](https://github.com/devreplay/devreplay-actions/runs/1186293055)


## Tool support plan

* ✅: Done
* 🏃: Work in progress

|Language|Tool|command|Validate Rules|Generate Rules|
|---|---|---|---|---|
|JavaScript|ESLint|--eslint-js| ✅ | ✅ |
|JavaScript|StandardJS||  |  |
|TypeScript|ESLint|--eslint-ts| 🏃 |  |
|Java|PMD|--pmd-java| ✅ | ✅ |
|Python|Pylint|--pylint|✅|🏃|
|Python|flake8|||
|Python|black|||
|Ruby|robocop|||