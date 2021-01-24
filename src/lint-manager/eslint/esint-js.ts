import { Result } from 'sarif';
import {CLIEngine, Linter } from 'eslint';
import * as fs from 'fs';
import * as path from 'path';

import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
import { getAllFiles } from '../../util';
import { execSync } from 'child_process';

export type Rules = {
    engine: CLIEngine
    ruleIds: string[]
}

export function getRulesFromFile (cwd: string): string[] {
    const linter = new Linter({ cwd: cwd });
    const ruleIds: string[] = [];
    linter.getRules().forEach((_module, ruleId) => {
        ruleIds.push(ruleId);
    });
    return ruleIds;
}

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

export function getEnabledRules(rootFilePath: string): string[] {
    const cmd = ['eslint', '--print-config', rootFilePath];
    const pmdCmd = execSync(cmd.join(' '));
    const configStr = pmdCmd.toString().trim();
    const rules = (JSON.parse(configStr) as Linter.Config).rules;

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

export class ESLintJSManager extends LintManager {
    engine: CLIEngine;
    ESRecommended: string[];
    ESAll: string[];
    extension: string;
    config: Linter.BaseConfig<Linter.RulesRecord>;
    rootFile: string;

    constructor (projectPath: string){
        super(projectPath);
        this.ESRecommended = ['eslint:recommended'];
        this.ESAll = ['eslint:all'];
        this.extension = '.js';
        this.config = {
            'parserOptions': {
                'ecmaVersion': 2018,
                'sourceType': 'module'
            }
        };
        this.rootFile = path.join(this.projectPath, 'index.js');
        const target_rules = this.selectExtends(true);
        const all_rules = this.getRulesFromExtends(target_rules);
        this.engine = all_rules.engine;
    }

    async execute (_cmd: string[]): Promise<Result[]> {
        const results: Result[] = [];
        const files = getAllFiles(this.projectPath)
            .filter((file) => file.endsWith(this.extension))
            .filter((file) => fs.existsSync(file));
        const reports = this.engine.executeOnFiles(files);

        reports.results.forEach((report) => {
            const {messages} = report;
            messages.forEach((message) => {
                if (message.ruleId !== null) {
                    results.push({
                        message: { text: message.message },
                        ruleId: message.ruleId,
                    });
                }
            });
        });
        return new Promise<Result[]>((resolve) => {
            resolve(results);
        });
    }

    getAvailableRules(): Promise<string[]> {
        const target_rules = this.selectExtends(false);
        const rules = this.getRulesFromExtends(target_rules);
        return new Promise<string[]>((resolve) => {
            resolve(rules.ruleIds);
        });
    }

    async makeRuleMap (): Promise<RuleMap> {
        const target_rules = this.selectExtends(true);
        const all_rules = this.getRulesFromExtends(target_rules);

        const results = await this.execute([]);
        const unfollowed = this.results2warnings(results);

        const enabled = getEnabledRules(this.rootFile);
        const ruleMap = new RuleMap(all_rules.ruleIds, unfollowed, enabled);
        console.log(all_rules.ruleIds.length);
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

    getRulesFromExtends (extendsName: string | string[]): Rules {
        const config = this.config;
        config.extends = extendsName;
    
        const engine = new CLIEngine({'baseConfig': config, 'useEslintrc': false});
        // const eslint = new ESLint({'baseConfig': config, 'useEslintrc': false});
        const rules = engine.getRules();
        // const linter = new Linter();
        // const rules = linter.getRules();
        const ruleIds: string[] = [];
        rules.forEach((_rule, key) => {
            ruleIds.push(key);
        });
        return {engine, ruleIds};
    }

    selectExtends (isAll?: boolean): string[] {
        if (isAll === true) {
          return this.ESAll;
        }
        return this.ESRecommended;
    }
}