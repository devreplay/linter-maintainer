// import { SplitedRules, outputRuleResultTable } from './rules'
// import * as fs from 'fs'
import * as path from 'path';
import * as csvWriter from 'csv-writer';
import * as fs from 'fs';

import * as gitminer from './gitminer';
import * as eslint from './lint-manager/eslint/esint';
import * as extend from './lint-manager/eslint/eslint-rule-extends';
import * as util from './util';

interface Warnings {
  version: string,
  configured: string[],
  warnings: string[]
}

export interface CountedWarnings {
  isSolved: boolean
  rule: string,
  max: number,
  prev: string,
  latest: string
}

export async function makeFileWarnings(targetProject: string): Promise<void> {
  const evaluateResult = await executeESLint4Release(targetProject, extend.ESAll);
  try {
    await writeOnCSV(`results/warnings/${path.basename(targetProject)}_LOC.csv`, evaluateResult);
  } catch(err) {
    console.log(err);
  }
}

export async function makeProjectWarnings(targetProject: string): Promise<void> {
  const evaluateResult = await evaluateLinterMaintainerResult(targetProject, extend.ESAll);
  try {
    fs.writeFileSync(`results/warnings/${path.basename(targetProject)}_LOC.json`,
                     JSON.stringify(evaluateResult, undefined, 2));
  } catch(err) {
    console.log(err);
  }
}

async function writeOnCSV(filepath: string, records: CountedWarnings[]) {

  const Writer = csvWriter.createObjectCsvWriter({
      path: filepath,
      header: [
          {id: 'isSolved', title: 'isSolved'},
          {id: 'rule', title: 'rule'},
          {id: 'max', title: 'max'},
          {id: 'prev', title: 'prev'},
          {id: 'latest', title: 'latest'}
      ]
  });
  
  await Writer.writeRecords(records)       // returns a promise
      .then(() => {
          console.log('...Done');
      });
}

export async function evaluateLinterMaintainerResult (projectpath: string, target_rules: string[]): Promise<Warnings[]> {
  const project = new gitminer.Project(projectpath);
  const ruleSets: Warnings[] = [];
  const tags: string[] = await project.getTagList();
  let oldTag = '';
  for (const tag of tags) {
    await project.checkout(tag);

    const files = eslint.filterFiles(util.getAllFiles(projectpath));

    const tag_kind = makeTagDiffKind(tag, oldTag);
    if (tag_kind === versionSize.MAJOR) {
      console.log(`Major diff ${oldTag} to ${tag}`);
    } else if (tag_kind === versionSize.MINOR) {
      console.log(`Minor diff ${oldTag} to ${tag}`);
    } else if (tag_kind === versionSize.MAINTENANCE) {
      console.log(`Maintenance diff ${oldTag} to ${tag}`);
    } else {
      continue;
    }

    const rules = eslint.getRulesFromExtends(target_rules, projectpath, false);
    const warnings = eslint.executeESLint(files, rules.engine);

    let configured_rules: string[];
    try {
      configured_rules = eslint.getRulesFromFile(projectpath).ruleIds;
    } catch (error) {
      configured_rules = [];
    }

    const warnResult: Warnings = {warnings: warnings, configured:configured_rules, version: tag};

    ruleSets.push(warnResult);
    oldTag = tag;
  }

  return ruleSets;
}


export async function executeESLint4Release (projectpath: string, target_rules: string[]): 
Promise<CountedWarnings[]>{
  const project = new gitminer.Project(projectpath);
  const tags: string[] = await project.getTagList();
  let prevVersion = '';

  let i = 0;
  const tag_len = tags.length;
  const violations: { [key: string]: CountedWarnings } = {};
  const solvedViolations: CountedWarnings[] = [];

  for (const tag of tags) {
    console.log(`${tag} ${i}/${tag_len}`);
    i++;
    try {
      await project.checkout(tag);
    } catch (error) {
      console.log(tag);
      continue;    
    }
    const files = eslint.filterFiles(util.getAllFiles(projectpath));

    const rules = eslint.getRulesFromExtends(target_rules, projectpath, false);
    const warnings = eslint.executeESLintDetail(files, rules.engine);
    for (const warning of warnings) {
      for (const rule of warning.rules) {
        const ruleStr = warning.uri + rule.ruleid;

        if (ruleStr in violations) {
          violations[ruleStr].max = Math.max(violations[ruleStr].max, rule.count);
          violations[ruleStr].latest = tag;
        } else {
          violations[ruleStr] = {
            rule: rule.ruleid,
            max: rule.count,
            isSolved: false,
            prev: prevVersion,
            latest: tag
          };
        }
      }
    }

    for (const key in violations) {
      const violation = violations[key];
      if (violation.latest !== tag) {
        violation.isSolved = true;
        solvedViolations.push(violation);
        delete violations[key];
      }
    }
    prevVersion = tag;
  }

  const output: CountedWarnings[] = Object.values(violations);

  return output.concat(solvedViolations);
}

const versionSize = {
  MAJOR: 0,
  MINOR: 1,
  MAINTENANCE: 2
};

function makeTagDiffKind (tag_a: string, tag_b: string) {
  // Check tag is X.Y.Z and return diff of the version
  // Major 0
  // Minor 1
  // Marintainance 2
  // Fail -1
  const partsA = gitminer.parseTagVersion(tag_a);
  const partsB = gitminer.parseTagVersion(tag_b);

  if (partsA.length !== partsB.length) {
    return -1;
  }

  let diff = 0;
  let diff_index = 0;
  for (let l = Math.max(partsA.length, partsB.length); diff_index < l; diff_index++) {
    const a = partsA[diff_index];
    const b = partsB[diff_index];
    diff = a === b ? 0 : a > b ? 1 : -1;
    if (diff) {
      return diff_index;
    }
  }
  return -1;
}
