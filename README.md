# Zenlint that make lint file automatically
 
## Usage

### 1. Install

```sh
npm install -g zenlint
```

### 2. Execute

#### 3.1 If you want to generate configfile such as `.eslintrc.json`

```sh
zenlint --generate ./your/project/path
```

#### 3.2 If you want to get recommended rules

```sh
$ zenlint ./your/project/path

Available  unicode-bom
Available  valid-jsdoc
Available  wrap-iife
Available  wrap-regex
Available  yield-star-spacing
Available  yoda
Ignored    no-undef
Ignored    no-fallthrough
Ignored    no-sparse-arrays
Ignored    no-redeclare
157 rules are available 4 rules are ignored 
```

#### 3.2 If you want to check rules by pull request

1. make `.github/workflows/zenlint.yml` on your project

```yml
name: "Zenlint test"
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
      - run: npm install zenlint
      - uses: actions/setup-node@v1
        with:
          node-version: "12.x"
      - run: echo "::add-matcher::.github/zenlint-match.json"   
      - name: Run zenlint
        run: node_modules/.bin/zenlint ./src
```

2. make `.github/zenlint-match.json`

```json
{
    "problemMatcher": [
        {
            "owner": "zenlint",
            "pattern": [
                {
                    "regexp": "^(warning|error)\\s+((Available|Ignored)\\s+(.+))",
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
* JavaScript/TypeScript
    * [x] ESLint (Also standard js is supported by eslint)
* Python
    * [ ] pylint
    * [ ] flake8
    * [ ] black
* Ruby
    * [ ] rubocop
* YAML
    * [ ] yamlint