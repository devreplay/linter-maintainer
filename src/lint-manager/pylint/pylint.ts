import { exec } from 'child_process';
import { Result } from 'sarif';

import { LintManager } from '../lint-manager';
import { RuleMap } from '../rule-map';

type PylintRules = {
    enabled: string[],
    disabled: string[]
}

function listMsg2Rules(listMsg: string): PylintRules {
    const splittedMsg = listMsg.split('Disabled messages:');
    const enabledMsg = splittedMsg[0];
    
    const ruleRegExp = /([a-z\d_-]+)\s\(([A-Z]\d+)\)/gm;

    let match: RegExpExecArray | null;
    let matches: RegExpExecArray[] = [];
    const enabled: string[] = [];
    const disabled: string[] = [];

    while ((match = ruleRegExp.exec(enabledMsg)) !== null) {
        matches.push(match);
    }
    for (const result of matches) {
        enabled.push(result[1]);
    }

    if (splittedMsg.length !== 2) {
        return {enabled, disabled};
    }

    const disabledMsg = splittedMsg[1];
    matches = [];

    while ((match = ruleRegExp.exec(disabledMsg)) !== null) {
        matches.push(match);
    }
    for (const result of matches) {
        disabled.push(result[1]);
    }
    
    return {enabled, disabled};
}

function getPylintRules(): Promise<PylintRules> {
    const cmd = ['pylint', '--list-msgs-enabled'];
    let rules: PylintRules;
    const pmdCmd = exec(cmd.join(' '), {});
    const pmdPromise = new Promise<PylintRules>((resolve, reject) => {
      pmdCmd.addListener('error', (e) => {
        console.error(e);
        reject(e);
      });
      pmdCmd.addListener('exit', () => {
        resolve(rules);
      });
  
      pmdCmd.stdout?.on('data', (stdout: string) => {
        rules = listMsg2Rules(stdout);
      });
      if (pmdCmd.stderr) {
        pmdCmd.stderr.on('data', (m: string) => {
          console.error(`error: ${m}`);
        });
      }
      
    });
    return pmdPromise;
}

function pylintResult2Sarif(pylintResult: string): Result[] {
    const output: Result[] = [];

    const ruleRegExp = /([a-z\d_-]+)\s\(([A-Z]\d+)\)/gm;

    let match: RegExpExecArray | null;
    const matches: RegExpExecArray[] = [];
    while ((match = ruleRegExp.exec(pylintResult)) !== null) {
        matches.push(match);
    }
    for (const result of matches) {
        output.push({
            message: { text: result[2] },
            ruleId: result[1],
          });
    }

    return output;
}


export class PylintManager extends LintManager {
    pylintPath: string;

    constructor (projectPath: string, pylintPath?: string, configPath?: string){
        super(projectPath);
        this.pylintPath = pylintPath? pylintPath: 'pmd';
        this.configPath = configPath;
    }

    execute(cmd: string[]): Promise<Result[]> {
        let result: Result[] = [];
        const pylintCmd = exec(cmd.join(' '), {});
        const pylintPromise = new Promise<Result[]>((resolve, reject) => {
          pylintCmd.addListener('error', (e) => {
            console.error(e);
            reject(e);
          });
          pylintCmd.addListener('exit', () => {
            resolve(result);
          });
      
          pylintCmd.stdout?.on('data', (stdout: string) => {
            result = pylintResult2Sarif(stdout);
          });
          if (pylintCmd.stderr) {
            pylintCmd.stderr.on('data', (m: string) => {
              console.error(`error: ${m}`);
            });
          }
          
        });

        return pylintPromise;
    }

    async getAvailableRules(): Promise<string[]> {
        const rules = await getPylintRules();
        return [...rules.enabled, ...rules.disabled];
    }

    async makeRuleMap(): Promise<RuleMap> {
        const command = ['pylint', this.projectPath, '--msg-template=\'{symbol} ({msg_id})\'', '--enable=all'];
        const results = await this.execute(command);
        const rules = await getPylintRules();

        const all = [...rules.enabled, ...rules.disabled];
        const unfollowed = this.results2warnings(results);
        const enabled = rules.enabled;

        return new RuleMap(all, unfollowed, enabled);
    }

    makeConfigFile(): Promise<string> {
        throw new Error('Method not implemented.');
    }
}