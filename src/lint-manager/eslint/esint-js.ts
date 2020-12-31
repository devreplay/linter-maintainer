import { Result } from 'sarif';
import * as path from 'path';
import * as fs from 'fs';

import {RuleMap} from '../rule-map';
import { LintManager } from '../lint-manager';
import * as eslint_manager from './esint';
import * as extend from './eslint-rule-extends';
import { getAllFiles } from '../../util';

export class ESLintManager extends LintManager {    
    execute (projectPath: string, configFile?: string): Result[] {
        console.log(projectPath);
        console.log(configFile);
        // https://github.com/github/super-linter/blob/156024e23187792ce8233ce93a194296fd70ca15/lib/linter.sh#L747
        const cmd = ['eslint', '--no-eslintrc', '-c', '${JAVASCRIPT_ES_LINTER_RULES}'];
        console.log(cmd);
        // "pylint --rcfile ${PYTHON_PYLINT_LINTER_RULES}"
        // "flake8 --config=${PYTHON_FLAKE8_LINTER_RULES}"
        // "black --config ${PYTHON_BLACK_LINTER_RULES} --diff --check"
        // "java -jar /usr/bin/checkstyle -c ${JAVA_LINTER_RULES}"
        
        // すべてのルールを取得
        const rules = this.getAvailableRules();
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


    getAvailableRules(): string[] {
        const typescript = false;
        const target_rules = extend.selectExtends(false, true, false);
        const rules = eslint_manager.getRulesFromExtends(target_rules, this.projectPath, true, typescript);
        return rules.ruleIds;
    }

    makeRuleMap (): Promise<RuleMap> {
        const typescript = false;
        const standard = false;
        const target_rules = extend.selectExtends(false, true, false);
        const files = eslint_manager.filterFiles(getAllFiles(this.projectPath));
        const rules = eslint_manager.getRulesFromExtends(target_rules, this.projectPath, true, typescript);

        const warnings = eslint_manager.executeESLint(files, rules.engine);
        
        // 現状のリストまたはデフォルトを取得
        let configured_rules: eslint_manager.Rules;
        try {
          configured_rules = eslint_manager.getRulesFromFile(this.projectPath);
        } catch (error) {
          const defaultrules = extend.selectExtends(typescript, false, standard);
          configured_rules = eslint_manager.getRulesFromExtends(defaultrules, this.projectPath, false, typescript);
        }
        const enabled_rules = configured_rules.ruleIds;
        const ruleMap = new RuleMap(rules.ruleIds, enabled_rules, warnings);
        return new Promise<RuleMap>((resolve) => {
            resolve(ruleMap);
        });
    }

    async outputConfigFile (): Promise<void> {
        const ruleMap = await this.makeRuleMap();
        const config = eslint_manager.makeConfig(ruleMap.followed, this.projectPath, false);
        const content = `${JSON.stringify(config, undefined, 2)}\n`;
        fs.writeFileSync(path.join(this.projectPath, '.eslintrc.json'), content, 'utf-8');
        console.log(`Success to generate ${path.join(this.projectPath, '.eslintrc.json')}`);
    }
}