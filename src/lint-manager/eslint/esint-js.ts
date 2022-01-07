import { Result } from 'sarif';
import { Linter } from 'eslint';
import * as fs from 'fs';
import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';


import { rules as allRules } from './rules-js';
import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
import { getAllFiles } from '../../util';
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
    const formatkey = ['-f', 'json'];
    const cmd = [eslintPath, ...formatkey, dirName];
    return  cmd;
}

export class ESLintJSManager extends LintManager {
    eslintPath: string;
    extension: string;
    config: Linter.BaseConfig<Linter.RulesRecord>;

    constructor (projectPath: string, eslintPath?: string, configPath?: string) {
        super(projectPath);
        this.eslintPath = eslintPath? eslintPath: 'eslint';
        this.extension = '.js';
        if (configPath) {
            this.config = getESLintConfig(configPath);
        } else {
            this.config = getESLintConfig(this.projectPath);
        }
    }

    async execute (_cmd: string[]): Promise<Result[]> {
        const data = await runESLint(cmd);
        const output = eslintOutput2Sarif(pmdData);
      
        return output;
    }

    getAvailableRules(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            resolve(allRules);
        });
    }

    async makeRuleMap (): Promise<RuleMap> {
        const target_rules = this.selectExtends(true);

        const results = await this.execute([]);
        const unfollowed = this.results2warnings(results);

        const enabled = getEnabledRules(this.rootFile);
        const ruleMap = new RuleMap(allRules, unfollowed, enabled);
        console.log(allRules.length);
        console.log(unfollowed.length);
        console.log(enabled.length);
        console.log();


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

    // getRulesFromExtends (extendsName: string | string[]): Partial<Linter.RulesRecord> {
    //     const config = this.config;
    //     config.extends = extendsName;
    
    //     const engine = new CLIEngine({'baseConfig': config, 'useEslintrc': false});
    //     // const eslint = new ESLint({'baseConfig': config, 'useEslintrc': false});
    //     const rules = engine.getRules();
    //     // const linter = new Linter();
    //     // const rules = linter.getRules();
    //     const ruleIds: string[] = [];
    //     rules.forEach((_rule, key) => {
    //         ruleIds.push(key);
    //     });
    //     return ruleIds;
    // }
}