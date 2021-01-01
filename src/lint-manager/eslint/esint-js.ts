import { Result } from 'sarif';

import {RuleMap} from '../rule-map';
import { LintManager } from '../lint-manager';
import * as eslint_manager from './esint';
import * as extend from './eslint-rule-extends';
import { getAllFiles } from '../../util';

export class ESLintManager extends LintManager {
    typescript = false;
    constructor (projectPath: string, isTS: boolean){
        super(projectPath);
        this.typescript = isTS;
    }
    async execute (cmd: string[]): Promise<Result[]> {
        console.log(cmd);
        
        // すべてのルールを取得
        const rules = await this.getAvailableRules();
        // ルールを用いて実行する
        const warnings: Result[] = [];
        // 実行結果を返す
        for (const rule of rules) {
            warnings.push({
                ruleId: rule,
                message: {}
            });
        }

        return warnings;
    }


    getAvailableRules(): Promise<string[]> {
        const target_rules = extend.selectExtends(false, true, false);
        const rules = eslint_manager.getRulesFromExtends(target_rules, this.projectPath, true, this.typescript);
        return new Promise<string[]>((resolve) => {
            resolve(rules.ruleIds);
        });
    }

    makeRuleMap (): Promise<RuleMap> {
        const standard = false;
        const target_rules = extend.selectExtends(false, true, false);
        const files = eslint_manager.filterFiles(getAllFiles(this.projectPath));
        const rules = eslint_manager.getRulesFromExtends(target_rules, this.projectPath, true, this.typescript);

        const warnings = eslint_manager.executeESLint(files, rules.engine);
        
        // 現状のリストまたはデフォルトを取得
        let configured_rules: eslint_manager.Rules;
        try {
          configured_rules = eslint_manager.getRulesFromFile(this.projectPath);
        } catch (error) {
          const defaultrules = extend.selectExtends(this.typescript, false, standard);
          configured_rules = eslint_manager.getRulesFromExtends(defaultrules, this.projectPath, false, this.typescript);
        }
        const enabled_rules = configured_rules.ruleIds;
        const ruleMap = new RuleMap(rules.ruleIds, enabled_rules, warnings);
        return new Promise<RuleMap>((resolve) => {
            resolve(ruleMap);
        });
    }

    async makeConfigFile (): Promise<string> {
        const ruleMap = await this.makeRuleMap();
        const config = eslint_manager.makeConfig(ruleMap.followed, this.projectPath, false);
        const content = `${JSON.stringify(config, undefined, 2)}\n`;
        return content;
    }
}