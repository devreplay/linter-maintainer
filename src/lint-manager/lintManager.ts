// export interface SARIFResult {
//     ruleId: string,
//     level: ["error", "warning", "information", "hint"],
//     message: string
//     locations: 
// }
// import { Result } from 'sarif';

import { RuleMap } from './rules';

export interface LintManager {
    // 設定ファイルを取得する
    // Lintを実行する
    // 実行結果に基づいて設定ファイルを編集する
    projectPath: string;
    configPath?: string;
    targetFiles?: string[];

    // execute(path: string, configFile?: string): Result[]
    // executeWithRules(path: string, ruleIds: string[]): Result[]
    getAvailableRules(): string[]
    makeRuleMap(): RuleMap | undefined
    outputConfigFile(): void
}
