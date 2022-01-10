import { exec } from 'child_process';
import { cwd } from 'process';
import { Result } from 'sarif';
import { Linter } from 'eslint';
import * as fs from 'fs';
import * as path from 'path';
import { dump as yamlDump } from 'js-yaml';
// import { tryReadFile } from '../../util';

import { rules as allRules } from './rules-js';
import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
import { execSync } from 'child_process';

export function getESLintConfig (rootFilePath: string): Linter.Config {
    // find eslintrc file that start with '.eslintrc'
    // const fileConfig = readESLintRC(rootFilePath);
    // if (fileConfig) {
    //     return fileConfig;
    // }
    // throw new Error('No eslintrc file found');
    const cmd = ['eslint', '--print-config', rootFilePath];
    const eslintCmd = execSync(cmd.join(' '));
    const configStr = eslintCmd.toString().trim();
    const config = JSON.parse(configStr) as Linter.Config;

    return config;
}

// function readESLintRC(filePath: string): Linter.Config<Linter.RulesRecord> | undefined {
//     const contents = tryReadFile(filePath);
//     if (!contents) {
//         console.log('fileConfig is empty');

//         return undefined;
//     }
//     if (filePath.endsWith('.json')) {
//         return JSON.parse(contents) as Linter.Config;
//     }
//     else if(filePath.endsWith('.js')) {
//         // TODO: support .eslintrc.js
//         return undefined;
//     }
//     else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
//         return yamlLoad(contents) as Linter.Config;
//     }

//     return undefined;
    
// }


function eslintResult2Sarif(eslintResult: string): Result[] {
    const output: Result[] = [];

    const fileRegExp = /^([^\\s].*)$/gm;
    const ruleRegExp = /^\\s+(\\d+):(\\d+)\\s+(error|warning|info)\\s+(.*)\\s\\s+(.*)$/gm;

    let match: RegExpExecArray | null;


    // read ESresult by one line
    for (const line of eslintResult.split('\n')) {
        const fileMatch = fileRegExp.exec(line);
        if (fileMatch) {
            continue;
        } else {
            while ((match = ruleRegExp.exec(line)) !== null) {
                const result: Result = {
                    message: { text: match[4] },
                    ruleId: match[5],
                };
                output.push(result);
            }
        }
    }
    return output;
}

function makeESLintCommand(dirName: string, eslintPath: string, rulePath?: string) {
    const formatkey = ['--format', 'stylish'];
    const cmd = [eslintPath, dirName, ...formatkey];
    if (rulePath) {
        cmd.push(...['--config', rulePath]);
    }
    return  cmd;
}


function config2Rules(config: Linter.BaseConfig<Linter.RulesRecord>) {
    const rules = config.rules;
    if (rules) {
        return new Promise<string[]>((resolve) => {
            resolve(Object.keys(rules));
        });
    } else {
        return new Promise<string[]>((_resolve, reject) => {
            reject('no rules');
        });
    }
}

export class ESLintJSManager extends LintManager {
    eslintPath: string;
    config: Linter.BaseConfig<Linter.RulesRecord>;

    constructor (projectPath: string, eslintPath?: string) {
        super(projectPath);
        this.eslintPath = eslintPath? eslintPath: 'eslint';
        this.config = getESLintConfig(this.projectPath);
    }

    execute (cmd: string[]): Promise<Result[]> {
        let result: Result[] = [];
        const eslintCmd = exec(cmd.join(' '), {});
        const eslintPromise = new Promise<Result[]>((resolve, reject) => {
          eslintCmd.addListener('error', (e) => {
            console.error(e);
            reject(e);
          });
          eslintCmd.addListener('exit', () => {
            resolve(result);
          });
      
          eslintCmd.stdout?.on('data', (stdout: string) => {
            result = eslintResult2Sarif(stdout);
          });
          if (eslintCmd.stderr) {
            eslintCmd.stderr.on('data', (m: string) => {
              console.error(`error: ${m}`);
            });
          }
          
        });

        return eslintPromise;
    }

    getAvailableRules(): Promise<string[]> {
        // const allRuleConfig = this.makeAllRuleConfig();
        return new Promise<string[]>((resolve) => {
            resolve(allRules);
        });
    }

    /**
     * 誤検出ルールを特定する
     */
    async getFalsePositive() {
        // 現在の状態で実行する
        const command = makeESLintCommand(this.projectPath, this.eslintPath);

        const results = await this.execute(command);
        const unfollowed = this.results2warnings(results);
        return unfollowed;
    }

    /**
     * 検出漏れルールを特定する
     */
    async getFalseNegative() {
        const allRulesConfig = this.makeAllRuleConfig();
        const allRulesContents = `${yamlDump(allRulesConfig, undefined)}\n`;
        const allRulesJsonPath = path.join(cwd(), '.eslintrc_all.yaml');
        fs.writeFileSync(allRulesJsonPath, allRulesContents);

        const command = makeESLintCommand(this.projectPath, this.eslintPath, allRulesJsonPath);
        const results = await this.execute(command);
        fs.unlinkSync(allRulesJsonPath);
        const unfollowed = this.results2warnings(results);


        const enabled = await config2Rules(this.config);
        const allRules = await config2Rules(allRulesConfig);

        return allRules.filter(rule => !enabled.includes(rule) && !unfollowed.includes(rule));
    }

    async makeRuleMap (): Promise<RuleMap> {
        const allRulesConfig = this.makeAllRuleConfig();
        const allRulesContents = `${yamlDump(allRulesConfig, undefined)}\n`;
        const allRulesJsonPath = path.join(cwd(), '.eslintrc_all.yaml');
        fs.writeFileSync(allRulesJsonPath, allRulesContents);

        const command = makeESLintCommand(this.projectPath, this.eslintPath, allRulesJsonPath);
        const results = await this.execute(command);
        // fs.unlinkSync(allRulesJsonPath);
        const unfollowed = this.results2warnings(results);

        const enabled = await config2Rules(this.config);
        // const reloadedAllRulesConfig = getESLintConfig(allRulesJsonPath);

        // if (reloadedAllRulesConfig) {
        //     const allRules = await config2Rules(reloadedAllRulesConfig);
        //     // console.log(allRules);
        //     fs.unlinkSync(allRulesJsonPath);

        //     return new RuleMap(allRules, unfollowed, enabled);
        // }

        fs.unlinkSync(allRulesJsonPath);
        console.log(allRules.length, unfollowed.length, enabled.length);
        return new RuleMap(allRules, unfollowed, enabled);
        // throw new Error('failed to reload all rules');   
    }

    rules2config(rules: string[]): string {
        const config = this.config;
        const newRule: Linter.RulesRecord = rules.reduce(
            (a, x) => ({...a,
                [x]: 'error'}),
            {}
        );
    
        config.rules = newRule;
        const content = `${yamlDump(config, undefined)}\n`;
        return content;
    }

    makeAllRuleConfig() {
        const config = this.config;

        // if (config.extends === undefined) {
        //     config.extends = ['eslint:all'];
        // } else if (typeof config.extends === 'string') {
        //     config.extends = ['eslint:all', config.extends];
        // } else {
        //     config.extends = ['eslint:all', ...config.extends];
        // }
        for (const rule of allRules) {
            if (!config.rules) {
                config.rules = {};
            }
            config.rules[rule] = 'error';
        }
        return config;
    }
}