import { Result } from 'sarif';
import { LintManager } from '../src/lint-manager/lint-manager'
import { RuleMap } from '../src/lint-manager/rule-map';


class TestLintManager extends LintManager {
    execute(_cmd: string[]): Promise<Result[]> {
        throw new Error('Method not implemented.');
    }
    getAvailableRules(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    makeRuleMap(): Promise<RuleMap> {
        throw new Error('Method not implemented.');
    }
    rules2config(_rules: string[]): string {
        throw new Error('Method not implemented.');
    }
    constructor(projectPath: string) {
        super(projectPath);
    }
}

const lintManager = new TestLintManager('');
const results: Result[] = [{
    ruleId: "rule A",
    message: { text: "rule A is missed" }
},
{
    ruleId: "rule B",
    message: { text: "rule B is also missed" }
}]

test('Convert results to warning', () => {
    expect(lintManager.results2warnings(results)).toStrictEqual(['rule A', 'rule B']);
});