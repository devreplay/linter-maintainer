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
    abstract rules2config(rules: string[]): string;
    
    async selectAppliedRules(): Promise<string[]> {
        return (await this.makeRuleMap()).followed;
    }
    
    async makeConfigFile (): Promise<string> {
        const rules = await this.selectAppliedRules();
        const config = this.rules2config(rules);
        return config;
    }

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