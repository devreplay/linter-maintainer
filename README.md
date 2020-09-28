# Zenlint that make lint file automatically
 
## Usage

1. Install

```sh
npm install -g zenlint
```

2. Execute

If you want to generate configfile such as `.eslintrc.json`
```sh
zenlint --generate ./your/project/path
```

If you want to get recommended rules

```sh
zenlint ./your/project/path
```

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