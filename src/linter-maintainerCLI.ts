import * as commander from 'commander';
import { LintManager } from './lint-manager/lint-manager';
import { ESLintJSManager } from './lint-manager/eslint/esint-js';
import { ESLintTSManager } from './lint-manager/eslint/esint-ts';
import { PMDManager } from './lint-manager/pmd/pmd-java8';
import { PylintManager } from './lint-manager/pylint/pylint';

interface Argv {
  version: string
  eslintJs?: boolean
  eslintTs?: boolean
  pmdJava?: boolean
  pylint?: boolean
  generate?: boolean
}

const cli = {
  async execute () {
    const program = new commander.Command();
    program
      .version('0.1.5')
      .description('Suitable the linters for your style')
      .option('--eslint-js', 'Use ESlint for JavaScript files')
      .option('--eslint-ts', 'Use ESLint for TypeScript files')
      .option('--pmd-java', 'Use PMD for Java files')
      .option('--pylint', 'Use Pylint for Python files')
      .option('--generate', 'Generate a config file on the target projects')
      .helpOption(true)
      .parse(process.argv);
    program.parse(process.argv);
    
    const args = program.args;
    const argv = program.opts() as Argv;
    if (args.length < 1) {
        console.error('No target pathes specified.');
        return 2;
    }
    const targetProject = args[0];

    let lintManager: LintManager;
    if (argv.eslintJs) {
      lintManager = new ESLintJSManager(targetProject);
    } else if (argv.eslintTs) {
      lintManager = new ESLintTSManager(targetProject);
    } else if (argv.pmdJava) {
      const pmdPath: string|undefined = args[1];
      const configPath: string|undefined  = args[2];
      lintManager = new PMDManager(targetProject, pmdPath, configPath);
    } else if (argv.pylint) {
      lintManager = new PylintManager(targetProject);
    } else {
      console.error('No target linter specified.');
      return 2;
    }

    if (argv.generate) {
      const configContent = await lintManager.makeConfigFile();
      console.log(configContent);
      return 0;
    } else {
      const ruleMap = await lintManager.makeRuleMap();
      console.log(ruleMap.makeAddRemovedSummary());
      const results_length = ruleMap.getFalseNegative().length + ruleMap.getFalsePositive().length;
      return results_length === 0 ? 0 : 1;
    }
  }
};

module.exports = cli;
