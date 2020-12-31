// export interface SARIFResult {
//     ruleId: string,
//     level: ["error", "warning", "information", "hint"],
//     message: string
//     locations: 
// }
// import { Result } from 'sarif';

import { Result } from 'sarif';
import { RuleMap } from './rules';

export abstract class LintManager {
    // 設定ファイルを取得する
    // Lintを実行する
    // 実行結果に基づいて設定ファイルを編集する
    projectPath: string;
    configPath?: string;
    targetFiles?: string[];
    constructor (projectPath: string){
        this.projectPath = projectPath;
    }

    // execute(path: string, configFile?: string): Result[]
    // executeWithRules(path: string, ruleIds: string[]): Result[]
    abstract getAvailableRules(): string[];
    abstract makeRuleMap(): Promise<RuleMap | undefined>;
    abstract outputConfigFile(): Promise<void>;

    results2warnings(results: Result[]): string[] {
        const newresult = [];
        for (const result of results) {
            if (result.ruleId !== undefined) {
                newresult.push(result.ruleId);
            }
        }
        return newresult;
    }
}