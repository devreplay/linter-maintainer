import { parse } from 'csv-parse/lib/sync';
import * as xml2js from 'xml2js';
import { Options } from 'csv-parse';
import { EOL } from 'os';
import { exec } from 'child_process';
import { Result } from 'sarif';
import { cwd } from 'process';
import path = require('path');
import fs = require('fs');

import { LintManager } from '../lint-manager';
import { RuleMap } from '../rule-map';
import { allRules, makeFullRuleID, makeShortRuleID } from './pmd-java8-rules';
import { tryReadFile } from '../../util';

interface PmdConfig {
  ruleset: {
    description: string
    rule: {
      ref: string
    }[]
  }
}

interface PmdResult {
  problem: string;
  package: string;
  file: string;
  priority: string;
  line: string;
  description: string;
  ruleSet: string;
  rule: string;
}

const PMD_COLUMNS: (keyof PmdResult)[] = [
  'problem',
  'package',
  'file',
  'priority',
  'line',
  'description',
  'ruleSet',
  'rule',
];

export function parsePmdCsv(csv: string): Array<PmdResult> {
  let results: PmdResult[];
  const parseOpts: Options = {
    columns: PMD_COLUMNS,
    relax_column_count: true,
  };
  try {
    results = parse(csv, parseOpts) as PmdResult[];
  } catch (e) {
    //try to recover parsing... remove last ln and try again
    const lines = csv.split(EOL);
    lines.pop();
    csv = lines.join(EOL);
    try {
      results = parse(csv, parseOpts) as PmdResult[];
    } catch (e) {
      throw new Error(
        'Failed to parse PMD Results.  Enable please logging (STDOUT & STDERROR) and submit an issue if this problem persists.'
      );
    }
  }
  return results;
}


function readConfig(xmlPath:string): Promise<PmdConfig> {
    // xmlを開く
    const contents = tryReadFile(xmlPath);
    if (contents === undefined) {
      throw new Error(
        'Failed to read PMD Config.'
      );
    }

    return new Promise<PmdConfig>(
      (resolve: (value: PmdConfig) => void, reject: (e: Error) => void): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xml2js.parseString(contents, (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as PmdConfig);
        }
      });
    });
}


async function collectRuleIdfromXML(xmlPath:string) {
  const config = await readConfig(xmlPath);
  const rules = [];
  for (const rule of config.ruleset.rule) {
    rules.push(rule.ref);
  }
  return rules;
}

function pmdJson2Sarif(pmdResults: Array<PmdResult>): Result[] {
  const output: Result[] = [];
  for (const pmdResult of pmdResults) {
    output.push({
      message: { text: pmdResult.description },
      ruleId: pmdResult.rule,
    });
  }
  return output;
}

function makePMDCommand(dirName: string, pmdPath: string, rulePath: string): string[] {
  const dictkey = ['-d', dirName];
  const formatkey = ['-f', 'csv'];
  const rulekey = ['-rulesets', rulePath];
  const cmd = [pmdPath, '-no-cache', ...dictkey, ...formatkey, ...rulekey];
  return  cmd;
}


function runPmd(cmd: string[]): Promise<string> {
  const commandBufferSize = 64;
  const pmdCmd = exec(cmd.join(' '), {
    maxBuffer: commandBufferSize * 1024 * 1024,
  });
  let stdoutSum = '';
  const pmdPromise = new Promise<string>((resolve, reject) => {
    pmdCmd.addListener('error', (e) => {
      console.error(e);
      reject(e);
    });
    pmdCmd.addListener('exit', () => {
      resolve(stdoutSum);
    });

    pmdCmd.stdout?.on('data', (stdout: string) => {
      stdoutSum += stdout;
    });
    if (pmdCmd.stderr) {
      pmdCmd.stderr.on('data', (m: string) => {
        console.error(`error: ${m}`);
      });
    }
  });
  return pmdPromise;
}

export class PMDManager extends LintManager {
  pmdPath: string;

  constructor (projectPath: string, pmdPath?: string, configPath?: string){
    super(projectPath, configPath);
    this.pmdPath = pmdPath? pmdPath: 'pmd';
  }

  async execute (cmd: string[]): Promise<Result[]> {
    const data = await runPmd(cmd);
    const pmdData = parsePmdCsv(data);
    const output = pmdJson2Sarif(pmdData);
  
    return output;
  }

  getAvailableRules(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      resolve(allRules);
  });
  }
  
  async makeRuleMap(): Promise<RuleMap> {
    const allRulesXMLContents = this.rules2config(allRules);
    const allRulesXMLPath = path.join(cwd(), 'all-rules.xml');
    fs.writeFileSync(allRulesXMLPath, allRulesXMLContents);

    const command = makePMDCommand(this.projectPath, this.pmdPath, allRulesXMLPath);
    const results = await this.execute(command);

    fs.unlinkSync(allRulesXMLPath);

    const all = await this.getAvailableRules();
    const unfollowed = this.results2warnings(results);
    const enabled = this.configPath? await collectRuleIdfromXML(this.configPath): [];
    return new RuleMap(all, unfollowed, enabled.map(x => makeShortRuleID(x)));
  }

  rules2config(rules: string[]): string {
    const head = [
      '<?xml version="1.0"?>',
      '<ruleset name="yourrule"',
      'xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"',
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      'xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.sourceforge.io/ruleset_2_0_0.xsd">',
      '<description>Your configuration of PMD. Includes the rules that are most likely to apply for you.</description>'];
    const content = rules.map(x => `<rule ref="${makeFullRuleID(x)}"/>`);
    const tail = '</ruleset>';     

    const output = [...head, ...content, tail].join('\n');
    return output;
  }
}
