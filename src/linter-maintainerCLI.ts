import * as commander from 'commander';
import { makeFileWarnings } from './projectBench';
import { ESLintManager } from './lint-manager/eslint/esint-js';

interface Argv {
  typescript?: boolean
  standard?: boolean
  all?: boolean
  evaluate?: boolean
  evaluate2?: boolean
  generate?: boolean
}

interface Option {
  short?: string
  // Commander will camelCase option names.
  name: keyof Argv | 'typescript' | 'standard' | 'all' | 'evaluate' | 'evaluate2' | 'generate'
  type: 'string' | 'boolean' | 'array'
  describe: string // Short, used for usage message
  description: string // Long, used for `--help`
}

const options: Option[] = [
  {
    name: 'typescript',
    type: 'boolean',
    describe: 'target typescript files',
    description: 'target typescript files'
  },
  {
    name: 'standard',
    type: 'boolean',
    describe: 'target the directory files',
    description: 'target the directory files'
  },
  {
    name: 'all',
    type: 'boolean',
    describe: 'make pattern from two files',
    description: 'make pattern from two files'
  },
  {
    name: 'evaluate',
    type: 'boolean',
    describe: 'evaluate linter-maintainer on the target projects',
    description: 'evaluate linter-maintainer on the target projects'
  },
  {
    name: 'evaluate2',
    type: 'boolean',
    describe: 'evaluate2 linter-maintainer on the target projects',
    description: 'evaluate2 linter-maintainer on the target projects'
  },
  {
    name: 'generate',
    type: 'boolean',
    describe: 'generate .eslint.yml on the target projects',
    description: 'generate .eslint.yml on the target projects'
  }
];

const cli = {
  async execute () {
    for (const option of options) {
      const commanderStr = optionUsageTag(option) + optionParam(option);
      if (option.type === 'array') {
        commander.option(commanderStr, option.describe, collect, []);
      } else {
        commander.option(commanderStr, option.describe);
      }
    }
    const parsed = commander.parseOptions(process.argv.slice(2));
    const args = parsed.operands;
    if (parsed.unknown.length !== 0) {
      (commander.parseArgs as (args: string[], unknown: string[]) => void)([], parsed.unknown);
    }
    const argv = commander.opts() as Argv;
    if (!(args.length > 0) && !argv.evaluate) {
        console.error('No pathes specified.');
        return 2;
    }
    const targetProjects = args;

    if (argv.evaluate) {
      for (const targetProject of targetProjects) {
        await makeFileWarnings(targetProject);
      }
    } 
    // else if (argv.evaluate2) {
    //   for (const targetProject of targetProjects) {
    //     console.log(`\n*** Apply on the ${path.basename(targetProject)} ***`)
    //     const project = new gitminer.Project(targetProject)
  
    //     await project.checkOutToHEAD()
    //     let changedFiles = (await project.getChangedFilesWithHEAD(currentIndex, oldIndex))
    //       .map(file => { return path.join(targetProject, file) })
    //     let filteredFiles = filterFiles(changedFiles, argv.typescript)
  
    //     const ruleExtend = extend.selectExtends(argv.typescript, argv.all, argv.standard)
    //     const allRules = eslint_manager.getRulesFromExtends(ruleExtend, targetProject, argv.all, argv.typescript)
    //     const ruleSets = await eslint_manager.makeRuleSets(targetProject, filteredFiles, currentIndex, oldIndex)
  
    //     await project.checkOutToHEAD()
    //     changedFiles = (await project.getChangedFilesWithHEAD(currentIndex))
    //       .map(file => { return path.join(targetProject, file) })
    //     filteredFiles = filterFiles(changedFiles, argv.typescript)
  
    //     const currentRules = eslint_manager.getRuleStatus(targetProject, filteredFiles, allRules)
    //     // const currentRules = await getSlideRules(targetProject, currentIndex, filteredFiles, allRules)
  
    //     if (currentRules === undefined) {
    //       continue
    //     }
  
    //     currentResults.push(currentRules)
    //     evaluateRuleSets(currentRules, ruleSets, targetProject)
    //   }
    // }
    else{
      // const target_rules = extend.selectExtends(argv.typescript, true, argv.standard);
      for (const targetProject of targetProjects) {
        const lintManager = new ESLintManager(targetProject);

        if (argv.generate) {
          lintManager.outputConfigFile();
        } else {
          const ruleMap = lintManager.makeRuleMap();
          const hiddenRules = ruleMap.getFalseNegative();
          const unwantedRules = ruleMap.getFalsePositive();
          console.log(ruleMap.makeAddRemovedSummary());
          const results_length = hiddenRules.length + unwantedRules.length;
          return results_length === 0 ? 0 : 1;
        }
      }
    }
    return 0;
  }
};

// function evaluateRuleSets (currentRule: SplitedRules, rules: RuleIds, targetProject: string): void {
//   const level: string[] = [
//     'current',
//     'all',
//     'recommend',
//     'standard',
//     'benchmark',
//     'approach'
//   ]
//   const result: SplitedRules[] = [currentRule]
//   const allRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.all)
//   result.push(allRule)

//   const recommendRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.recommend)
//   result.push(recommendRule)

//   const standardRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.standard)
//   result.push(standardRule)

//   if (rules.benchmark !== undefined) {
//     const benchmarkRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.benchmark)
//     result.push(benchmarkRule)
//   }

//   if (rules.approach !== undefined) {
//     const approachRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.approach)
//     result.push(approachRule)
//   }

//   const currentCSV = `results/${path.basename(targetProject)}.csv`
//   outputRuleResultTable(result, level, currentCSV)
// }

export function filterFiles (files: string[], isTS?: boolean): string[] {
  const tsPath = '.ts';
  const jsPath = '.js';

  if (isTS === true) {
    return files.filter(file => { return file.endsWith(tsPath); });
  } else {
    return files.filter(file => { return file.endsWith(jsPath); });
  }
}

function collect (val: string, memory: string[]): string[] {
  memory.push(val);

  return memory;
}

function optionUsageTag ({ short, name }: Option): string {
  return short !== undefined ? `-${short}, --${name}` : `--${name}`;
}

function optionParam (option: Option): string {
  switch (option.type) {
    case 'string':
      return ` [${option.name}]`;
    case 'array':
      return ` <${option.name}>`;
    case 'boolean':
      return '';
    default:
      return '';
  }
}

module.exports = cli;
