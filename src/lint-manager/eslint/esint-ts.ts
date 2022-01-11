import { ESLintJSManager } from './esint-js';
import { rules as allRules } from './rules-ts';

export class ESLintTSManager extends ESLintJSManager {
    constructor (projectPath: string){
        super(projectPath);
    }

    getAvailableRules(): Promise<string[]> {
        // const allRuleConfig = this.makeAllRuleConfig();
        return new Promise<string[]>((resolve) => {
            resolve(allRules);
        });
    }
}
