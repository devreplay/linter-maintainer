import { Result } from 'sarif';
import { RuleMap } from './rule-map';

export abstract class LintManager {
    projectPath: string;
    configPath?: string;
    targetFiles?: string[];
    constructor (projectPath: string, configPath?: string){
        this.projectPath = projectPath;
        this.configPath = configPath;
    }

    abstract execute (cmd: string[]): Promise<Result[]>;
    abstract getAvailableRules(): Promise<string[]>;
    abstract makeRuleMap(): Promise<RuleMap>;
    abstract makeConfigFile(): Promise<string>;

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