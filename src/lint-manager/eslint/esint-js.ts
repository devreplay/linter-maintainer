import { exec } from 'child_process';
// import { cwd } from 'process';
import { Result } from 'sarif';
import { Linter } from 'eslint';
import * as fs from 'fs';
import * as path from 'path';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { tryReadFile } from '../../util';

import { rules as allRules } from './rules-js';
import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
import { execSync } from 'child_process';

function getESLintConfig (rootFilePath: string): Linter.Config {
    const cmd = ['eslint', '--print-config', rootFilePath];
    const eslintCmd = execSync(cmd.join(' '));
    const configStr = eslintCmd.toString().trim();
    const config = JSON.parse(configStr) as Linter.Config;

    return config;
}

function readESLintRC(filePath: string): Linter.Config<Linter.RulesRecord> {
    const contents = tryReadFile(filePath);
    if (!contents) {
        throw new Error(`fileConfig is empty: ${filePath}`);
    }
    if (filePath.endsWith('.json')) {
        return JSON.parse(contents) as Linter.Config;
    }
    else if(filePath.endsWith('.js')) {
        // TODO: support .eslintrc.js
        throw new Error('unsupported .eslintrc.js');
    }
    else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        return yamlLoad(contents) as Linter.Config;
    }

    throw new Error(`unsupported config file: ${filePath}`); 
}

function eslintResult2Sarif(eslintResult: string): Result[] {
    const output: Result[] = [];

    const ruleRegExp = /^\s+(\d+):(\d+)\s+(error|warning|info)\s+(.*)\s\s+(.*)$/gm;

    let match: RegExpExecArray | null;


    for (const line of eslintResult.split('\n')) {
        while ((match = ruleRegExp.exec(line)) !== null) {
            const result: Result = {
                message: { text: match[4].toString() },
                ruleId: match[5].toString(),
            };
            output.push(result);
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

function config2String(config: Linter.BaseConfig<Linter.RulesRecord>, configPath: string) {
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        return `${yamlDump(config, undefined)}\n`;
    } else if (configPath.endsWith('.json')) {
        return `${JSON.stringify(config, undefined, 2)}\n`;
    }
    throw new Error(`unsupported config file: ${configPath}`);
}

function config2Rules(config: Linter.BaseConfig<Linter.RulesRecord>) {
    const rules = config.rules;
    if (rules) {
        return new Promise<string[]>((resolve) => {
            // remove rules that are 'off'
            const enabledRules = Object.keys(rules).filter(rule => rules[rule] !== 'off' && rules[rule] !== ['off']);
            resolve(enabledRules);
        });
    } else {
        return new Promise<string[]>((_resolve, reject) => {
            reject('no rules');
        });
    }
}

export class ESLintJSManager extends LintManager {
    eslintPath: string;
    // config: Linter.BaseConfig<Linter.RulesRecord>;

    constructor (projectPath: string, eslintPath?: string) {
        super(projectPath);
        this.eslintPath = eslintPath? eslintPath: 'eslint';
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

    async getFalsePositive() {
        const command = makeESLintCommand(path.dirname(this.projectPath), this.eslintPath);

        const results = await this.execute(command);
        const unfollowed = this.results2warnings(results);
        return unfollowed;
    }

    async getFalseNegative() {
        const config = getESLintConfig(this.projectPath);
        const allRulesConfig = await this.makeAllRuleConfig(config);
        const configDir = path.dirname(path.resolve(this.projectPath));
        const allRulesJsonPath = path.join(configDir, '.eslintrc_all.yaml');
        const allRulesContents = config2String(allRulesConfig, allRulesJsonPath);
        fs.writeFileSync(allRulesJsonPath, allRulesContents);

        const command = makeESLintCommand(path.dirname(this.projectPath), this.eslintPath, allRulesJsonPath);
        const results = await this.execute(command);
        fs.unlinkSync(allRulesJsonPath);
        const unfollowed = this.results2warnings(results);


        const enabled = await config2Rules(config);
        const allRules = await config2Rules(allRulesConfig);

        return allRules.filter(rule => !enabled.includes(rule) && !unfollowed.includes(rule));
    }

    disableRules(rules: string[], configPath: string) {
        const config = readESLintRC(configPath);
        if (!config.rules) {
            config.rules = {};
        }
        for (const rule of rules) {
            config.rules[rule] = 'off';
        }
        return config2String(config, configPath);
    }
    
    enableRules(rules: string[], configPath: string) {
        const config = readESLintRC(configPath);
        if (!config.rules) {
            config.rules = {};
        }
        for (const rule of rules) {
            config.rules[rule] = 'error';
        }
        return config2String(config, configPath);
    }

    async makeRuleMap (): Promise<RuleMap> {
        const config = getESLintConfig(this.projectPath);
        const allRulesConfig = await this.makeAllRuleConfig(config);
        const allRulesContents = `${yamlDump(allRulesConfig, undefined)}\n`;
        const configDir = path.dirname(path.resolve(this.projectPath));
        const allRulesJsonPath = path.join(configDir, '.eslintrc_all.yaml');
        fs.writeFileSync(allRulesJsonPath, allRulesContents);

        const command = makeESLintCommand(path.dirname(this.projectPath), this.eslintPath, allRulesJsonPath);
        const results = await this.execute(command);
        fs.unlinkSync(allRulesJsonPath);

        const unfollowed = this.results2warnings(results);
        const enabled = await config2Rules(config);

        return new RuleMap(await this.getAvailableRules(), unfollowed, enabled);
    }

    rules2config(rules: string[]): string {
        return this.enableRules(rules, this.projectPath);
    }

    async makeAllRuleConfig(config: Linter.BaseConfig<Linter.RulesRecord>) {
        for (const rule of (await this.getAvailableRules())) {
            if (!config.rules) {
                config.rules = {};
            }
            if (config.rules[rule]) {
                if (config.rules[rule] !== 'off' && config.rules[rule] !== ['off']) {
                    config.rules[rule] = 'error';
                }
            } else {
                config.rules[rule] = 'error';
            }
        }
        return config;
    }
}