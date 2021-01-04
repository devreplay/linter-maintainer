## ESLint

### Validate rules

For JavaScript

```sh
linter-maintainer --eslint-js ./your/project/path
```

For TypeScript

```sh
linter-maintainer --eslint-ts ./your/project/path
```

### Generate rules

For JS

```sh
linter-maintainer --generate --eslint-js ./your/project/path > .eslintrc.json
```

For TypeScript

```sh
linter-maintainer --generate --eslint-ts ./your/project/path > .eslintrc.json
```


<!-- ### Background command

```sh
eslint --no-eslintrc -c .eslintrc.yml
``` -->

## PMD for Java

### Dependencies

1. You needs to install PMD from [official page](https://pmd.github.io/).
I checked works on the PMD version 6.30.0.

2. LinterMaintainer will work by executing local PMD path.
    * Windows: `pmd.bat`
    * Linux: `$HOME/pmd-bin-6.30.0/bin/run.sh pmd`
Following example use the path of `pmd.bat`

<!-- 
### Background command
```sh
pmd.bat -d ./your/project/path -f csv -rulesets category/java/bestpractices.xml,category/java/codestyle.xml,category/java/design.xml,category/java/documentation.xml,category/java/errorprone.xml,category/java/multithreading.xml,category/java/performance.xml,category/java/security.xml              
``` -->

### Validate rules

```sh
linter-maintainer --pmd-java ./your/project/path pmd.bat ./your/pmd/configfile.xml
```

### Generate rules

```sh
linter-maintainer --generate --pmd-java ./your/project/path pmd.bat > yourpmd.xml
```

<!-- https://github.com/github/super-linter/blob/156024e23187792ce8233ce93a194296fd70ca15/lib/linter.sh#L747

"pylint --rcfile ${PYTHON_PYLINT_LINTER_RULES}"
"flake8 --config=${PYTHON_FLAKE8_LINTER_RULES}"
"black --config ${PYTHON_BLACK_LINTER_RULES} --diff --check" -->
<!-- "java -jar /usr/bin/checkstyle -c ${JAVA_LINTER_RULES}" -->


## Pylint

You needs to install [Pylint](https://www.pylint.org/) > 2.6

### Validate rules

```sh
linter-maintainer --pylint ./your/project/path
```

### Generate rules

```sh
linter-maintainer --generate --pylint ./your/project/path > pylintrc
```

<!-- ```sh
pylint test/python/simplecaeser.py --msg-template='{symbol} ({msg_id})'
``` -->