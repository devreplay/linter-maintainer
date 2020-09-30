// import commander = require('commander');
// import { tryReadFile } from './file';
import * as path from 'path'
import * as commander from 'commander'
import * as fs from 'fs'
import * as table from 'text-table';
import * as gitminer from './gitminer'
import { SplitedRules, outputRuleResultTable } from './rules'
import * as extend from './ruleExtends'
import { evaluateAndOutput } from './projectBench'
import * as eslint_manager from './esint_manager'
import * as util from './util'

interface Argv {
  typescript?: boolean
  standard?: boolean
  all?: boolean
  evaluate?: boolean
  evaluate2?: boolean
  generate?: boolean
}

interface RuleIds {
  recommend: string[]
  all: string[]
  standard: string[]
  benchmark?: string[]
  approach?: string[]
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
    describe: 'evaluate zenlint on the target projects',
    description: 'evaluate zenlint on the target projects'
  },
  {
    name: 'evaluate2',
    type: 'boolean',
    describe: 'evaluate2 zenlint on the target projects',
    description: 'evaluate2 zenlint on the target projects'
  },
  {
    name: 'generate',
    type: 'boolean',
    describe: 'generate .eslint.yml on the target projects',
    description: 'generate .eslint.yml on the target projects'
  }
]

const cli = {
  async execute () {
    for (const option of options) {
      const commanderStr = optionUsageTag(option) + optionParam(option)
      if (option.type === 'array') {
        commander.option(commanderStr, option.describe, collect, [])
      } else {
        commander.option(commanderStr, option.describe)
      }
    }
    const parsed = commander.parseOptions(process.argv.slice(2))
    const args = parsed.operands
    if (parsed.unknown.length !== 0) {
      (commander.parseArgs as (args: string[], unknown: string[]) => void)([], parsed.unknown)
    }
    const argv = commander.opts() as Argv
    if (!(args.length > 0)) {
        console.error('No pathes specified.');
        return 2;
    }
    let targetProjects = args;
  
    const currentIndex = 50
    const oldIndex = 100

    // const comparedResults = []
    const currentResults: SplitedRules[] = []

    if (argv.evaluate) {
      const repositoryPath = ''
      targetProjects = [
        path.join(repositoryPath, 'bower'),
        path.join(repositoryPath, 'eslint'),
        path.join(repositoryPath, 'hexo'),
        path.join(repositoryPath, 'karma')
      ]
      for (const targetProject of targetProjects) {
        await evaluateAndOutput(targetProject)
      }
    } else if (argv.evaluate2) {
      for (const targetProject of targetProjects) {
        console.log(`\n*** Apply on the ${path.basename(targetProject)} ***`)
        const project = new gitminer.Project(targetProject)
  
        await project.checkOutToHEAD()
        let changedFiles = (await project.getChangedFilesWithHEAD(currentIndex, oldIndex))
          .map(file => { return path.join(targetProject, file) })
        let filteredFiles = filterFiles(changedFiles, argv.typescript)
  
        const ruleExtend = extend.selectExtends(argv.typescript, argv.all, argv.standard)
        const allRules = eslint_manager.getRulesFromExtends(ruleExtend, targetProject, argv.all, argv.typescript)
        const ruleSets = await eslint_manager.makeRuleSets(targetProject, filteredFiles, currentIndex, oldIndex)
  
        await project.checkOutToHEAD()
        changedFiles = (await project.getChangedFilesWithHEAD(currentIndex))
          .map(file => { return path.join(targetProject, file) })
        filteredFiles = filterFiles(changedFiles, argv.typescript)
  
        const currentRules = eslint_manager.getRuleStatus(targetProject, filteredFiles, allRules)
        // const currentRules = await getSlideRules(targetProject, currentIndex, filteredFiles, allRules)
  
        if (currentRules === undefined) {
          continue
        }
  
        currentResults.push(currentRules)
        evaluateRuleSets(currentRules, ruleSets, targetProject)
      }
    }
    else{
      const target_rules = extend.selectExtends(argv.typescript, true, argv.standard)
      for (const targetProject of targetProjects) {
        const files = eslint_manager.filterFiles(util.getAllFiles(targetProject))
        const rules = eslint_manager.getRulesFromExtends(target_rules, targetProject, true, argv.typescript)
        // 警告リストを取得
        const warnings = eslint_manager.executeESLint(files, rules.engine)
        // 現状のリストまたはデフォルトを取得
        let config_rule: eslint_manager.Rules
        try {
          config_rule = eslint_manager.getRulesFromFile(targetProject)
        } catch (error) {
          const defaultrules = extend.selectExtends(argv.typescript, false, argv.standard)
          config_rule = eslint_manager.getRulesFromExtends(defaultrules, targetProject, false, argv.typescript)
        }
        const configured_rules = config_rule.ruleIds
        const configuredWarnings = eslint_manager.executeESLint(files, config_rule.engine)

        // 追加されるべきルールと削除すべきルールを取得
        // const ignoredRules = util.makeUncommonRules(configuredWarnings,)
        const unwarned_rules = util.makeUncommonRules(rules.ruleIds, warnings)
        const hiddenRules = util.makeUncommonRules(unwarned_rules, configured_rules)
        if (argv.generate) {
          const config = eslint_manager.makeConfig(hiddenRules, targetProject, argv.typescript)
          const content = `${JSON.stringify(config, undefined, 2)}\n`;
          fs.writeFileSync(path.join(targetProject, '.eslintrc.json'), content, "utf-8")
          console.log(`Success to generate ${path.join(targetProject, '.eslintrc.json')}`)
        } else {
          console.log(makeRuleResultStr(hiddenRules, configuredWarnings))
        }
      }
    }
    return 0
  }
}

function evaluateRuleSets (currentRule: SplitedRules, rules: RuleIds, targetProject: string): void {
  const level: string[] = [
    'current',
    'all',
    'recommend',
    'standard',
    'benchmark',
    'approach'
  ]
  const result: SplitedRules[] = [currentRule]
  const allRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.all)
  result.push(allRule)

  const recommendRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.recommend)
  result.push(recommendRule)

  const standardRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.standard)
  result.push(standardRule)

  if (rules.benchmark !== undefined) {
    const benchmarkRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.benchmark)
    result.push(benchmarkRule)
  }

  if (rules.approach !== undefined) {
    const approachRule = new SplitedRules(currentRule.followed, currentRule.unfollowed, rules.approach)
    result.push(approachRule)
  }

  const currentCSV = `results/${path.basename(targetProject)}.csv`
  outputRuleResultTable(result, level, currentCSV)
}

export function filterFiles (files: string[], isTS?: boolean): string[] {
  const tsPath = '.ts'
  const jsPath = '.js'

  if (isTS === true) {
    return files.filter(file => { return file.endsWith(tsPath) })
  } else {
    return files.filter(file => { return file.endsWith(jsPath) })
  }
}

function collect (val: string, memory: string[]): string[] {
  memory.push(val)

  return memory
}

function optionUsageTag ({ short, name }: Option): string {
  return short !== undefined ? `-${short}, --${name}` : `--${name}`
}

function optionParam (option: Option): string {
  switch (option.type) {
    case 'string':
      return ` [${option.name}]`
    case 'array':
      return ` <${option.name}>`
    case 'boolean':
      return ''
    default:
      return ''
  }
}

export function makeOptionStr (isTS?: boolean, isStandard?: boolean, isAll?: boolean): string {
  let optionStr = ''
  if (isTS === true) {
    optionStr += '_ts'
  }
  if (isStandard === true) {
    optionStr += '_standard'
  }
  if (isAll === true) {
    optionStr += '_all'
  }
  return optionStr
}


function makeRuleResultStr(added: string[], deleted: string[]): string {

  const outputTable: string[][] = []
  added = added.filter(x => x != undefined)
  for (const addedRule of added) {
    outputTable.push([
      'error',
      `${addedRule} is available it should be added to eslintrc`,
    ])
  }

  deleted = deleted.filter(x => x != undefined)
  for (const deletedRule of deleted) {
    outputTable.push([
      'error',
      `${deletedRule} is ignored it should be removed from eslintrc`
    ])
  }

  let output = table(outputTable)

  const addedRules = added.length
  const deletedRules = deleted.length
  const total = addedRules + deletedRules
  const summary = [
    `\n\n${addedRules} rules are available`,
    `${deletedRules} rules are ignored`,
    `\nTotal: ${total}`,
  ]
  output += summary.join(' ')
  return output
}


module.exports = cli
