import { exec } from 'child_process';
import { Result } from 'sarif';
import { Linter, ESLint } from 'eslint';
import * as fs from 'fs';
// import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';


import { rules as allRules } from './rules-js';
import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
// import { getAllFiles } from '../../util';
import { execSync } from 'child_process';

// export type Rules = {
//     engine: CLIEngine
//     ruleIds: string[]
// }

// export function getRulesFromFile (cwd: string): string[] {
//     const linter = new Linter({ cwd: cwd });
//     const ruleIds: string[] = [];
//     linter.getRules().forEach((_module, ruleId) => {
//         ruleIds.push(ruleId);
//     });
//     return ruleIds;
// }

// function searchConfigFile (cwd: string): string {
//     const files: string[] = [];
//     fs.readdirSync(cwd).forEach((file) => {
//         if (!file.includes('eslintrc')) {
//             return;
//         }
//         files.push(file);
//     });

//     if (files.length > 0) {
//         return files[0];
//     }
//     return '';
// }

export function getESLintConfig (rootFilePath: string): Linter.Config {
    const fileConfig = readESLintRC(rootFilePath);
    if (fileConfig) {
        return fileConfig;
    }
    const cmd = ['eslint', '--print-config', rootFilePath];
    const eslintCmd = execSync(cmd.join(' '));
    const configStr = eslintCmd.toString().trim();
    const config = JSON.parse(configStr) as Linter.Config;

    return config;
}

function readESLintRC(filePath: string): Linter.Config<Linter.RulesRecord> | undefined {
    if (filePath.endsWith('.json')) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Linter.Config;
    }
    else if(filePath.endsWith('.js')) {
        // TODO: support .eslintrc.js
        return undefined;
    }
    else if (filePath.endsWith('.yaml')) {
        return yamlLoad(fs.readFileSync(filePath, 'utf8')) as Linter.Config;
    }

    return undefined;
    
}


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

export function getEnabledRules(rootFilePath: string): string[] {
    const config = getESLintConfig(rootFilePath);
    const rules = config.rules;

    if (rules === undefined) {
        throw new Error('Failed to read the ESLint rules');
    }

    const output = [];
    for (const key of Object.keys(rules)) {
        const rule = rules[key];
        if (rule !== undefined && rule.toString() !== 'off') {
            output.push(key);
        } else {
            console.log(key);
        }
    }

    return output;
}

function makeESLintCommand(dirName: string, eslintPath: string) {
    const formatkey = ['--format', 'stylish'];
    const cmd = [eslintPath, ...formatkey, dirName];
    return  cmd;
}

export class ESLintJSManager extends LintManager {
    eslintPath: string;
    extension: string;
    config: Linter.BaseConfig<Linter.RulesRecord>;
    linter: Linter;

    constructor (projectPath: string, eslintPath?: string, configPath?: string) {
        super(projectPath);
        this.eslintPath = eslintPath? eslintPath: 'eslint';
        this.extension = '.js';
        if (configPath) {
            this.config = getESLintConfig(configPath);
        } else {
            this.config = getESLintConfig(this.projectPath);
        }
        this.linter = new Linter({ cwd: this.projectPath });
        // this.engine = new ESLint({baseConfig: this.config, useEslintrc: false});
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
        return new Promise<string[]>((resolve) => {
            resolve(allRules);
        });
    }

    removeFalsePositiveRules(): string[] {
        // 誤検出ルールを削除する
        return [];
    }

    addFalseNegativeRules(): string[] {
        // 検出漏れルールを追加する
        return [];
    }

    async makeRuleMap (): Promise<RuleMap> {
        // 新しいconfigファイルを作る
        // それを読み込んでESLintで実行する
        
        // 現在のESLintのルールを読み込む
        // 


        const command = makeESLintCommand(this.projectPath, this.eslintPath);

        const results = await this.execute(command);
        const unfollowed = this.results2warnings(results);
        // const rules: Partial<Linter.RulesRecord> | undefined = this.config.rules;
        this.config.extends = this.addExtends2AllRules(this.config.extends);
        // const ruleIDs: string[] = [];

        // if (rules) {
        //     for (const key of Object.keys(rules)) {
        //         const rule = rules[key];
        //         if (rule !== undefined && rule.toString() !== 'off') {
        //             ruleIDs.push(key);
        //         }
        //     }
        // }

        // const enabled = getEnabledRules(this.rootFile);
        const rules = this.linter.getRules();
        const ruleMap = new RuleMap(allRules, unfollowed, enabled);

        return new Promise<RuleMap>((resolve) => {
            resolve(ruleMap);
        });
    }

    rules2config(rules: string[]): string {
        const config = this.config;
        const newRule: Linter.RulesRecord = rules.reduce(
            (a, x) => ({...a,
                [x]: 'error'}),
            {}
        );
    
        config.rules = newRule;
        const content = `${JSON.stringify(config, undefined, 2)}\n`;
        return content;
    }

    addExtends2AllRules(extendsRules: string | string[] | undefined): string[] {
        if (extendsRules === undefined) {
            return ['eslint:all'];
        } else if (typeof extendsRules === 'string') {
            return ['eslint:all', extendsRules];
        } else {
            return ['eslint:all', ...extendsRules];
        }
    }
    // getRulesFromExtends (): string[] {
    //     const linter = new Linter();
    //     const rules = linter.getRules();
    //     const ruleIds: string[] = [];
    //     rules.forEach((_rule, key) => {
    //         ruleIds.push(key);
    //     });
    //     return ruleIds;
    // }
}