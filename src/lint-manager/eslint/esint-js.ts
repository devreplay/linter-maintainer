import { Result } from 'sarif';
import {CLIEngine, Linter} from 'eslint';
import * as fs from 'fs';

import { RuleMap } from '../rule-map';
import { LintManager } from '../lint-manager';
import { getAllFiles } from '../../util';

export type Rules = {
    engine: CLIEngine
    ruleIds: string[]
}

export function getRulesFromFile (cwd: string): Rules {
    const configFile = searchConfigFile(cwd);
    const config: CLIEngine.Options = {
            cwd,
            configFile
        };

    const engine = new CLIEngine(config);
    const rules = engine.getRules();
    const ruleIds: string[] = [];
    rules.forEach((_rule, key) => {
        ruleIds.push(key);
    });
    return {engine, ruleIds};
}

function searchConfigFile (cwd: string): string {
    const files: string[] = [];
    fs.readdirSync(cwd).forEach((file) => {
        if (!file.includes('eslintrc')) {
            return;
        }
        files.push(file);
    });

    if (files.length > 0) {
        return files[0];
    }
    return '';
}


export class ESLintManager extends LintManager {
    engine: CLIEngine;
    ESRecommended = ['eslint:recommended'];
    ESAll = ['eslint:all'];
    extension = '.js';
    constructor (projectPath: string){
        super(projectPath);
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

        let enabled: string[];
        try {
          enabled = getRulesFromFile(this.projectPath).ruleIds;
        } catch (error) {
          const defaultrules = this.selectExtends(false);
          enabled = this.getRulesFromExtends(defaultrules).ruleIds;
        }
        const ruleMap = new RuleMap(all_rules.ruleIds, unfollowed, enabled);
        return new Promise<RuleMap>((resolve) => {
            resolve(ruleMap);
        });
    }

    rules2config(rules: string[]): string {
        const config: Linter.BaseConfig<Linter.RulesRecord> = {
            'rules': {},
            'env': {},
            'parserOptions': {},
            'extends': []
        };
    
        config.parserOptions = {
            'ecmaVersion': 11,
            'sourceType': 'module'
        };
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
        const config: Linter.BaseConfig = {
            'extends': extendsName,
            'parserOptions': {
                'ecmaVersion': 2018,
                'sourceType': 'module'
            }
        };
    
        const engine = new CLIEngine({'baseConfig': config, 'useEslintrc': false});
        const rules = engine.getRules();
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