import * as table from 'text-table';
import * as csv from 'csv';
import * as fs from 'fs';

export class RuleMap {
  all: string[];
  followed: string[];
  unfollowed: string[];
  enabled: string[];
  disabled: string[];

  constructor (
    all: string[],
    unfollowed: string[],
    enabled: string[]
  ) {
    this.all = all;
    this.unfollowed = unfollowed;
    this.followed = makeAMinusBRules(this.all, this.unfollowed);
    this.enabled = enabled;
    this.disabled = makeAMinusBRules(this.all, this.enabled);
  }

  getTruePositive (): string[] {
    return makeCommonRules(this.enabled, this.followed);
  }

  getFalsePositive (): string[] {
    return makeCommonRules(this.enabled, this.unfollowed);
  }

  getTrueNegative (): string[] {
    return makeCommonRules(this.disabled, this.unfollowed);
  }

  getFalseNegative (): string[] {
    return makeCommonRules(this.followed, this.disabled);
  }

  getAcurracy (): number {
    return (this.enabled.length - this.getFalsePositive().length) / this.enabled.length;
  }

  getCoverage (): number {
    return (this.followed.length - this.getFalseNegative().length) / this.followed.length;
  }

  makeAddRemovedSummary(): string {
    const outputTable: string[][] = [];

    const FN = this.getFalseNegative();
    for (const addedRule of FN) {
      outputTable.push([
        'error',
        `${addedRule} is available it should be added`,
      ]);
    }

    const FP = this.getFalsePositive();
    for (const deletedRule of FP) {
      outputTable.push([
        'error',
        `${deletedRule} is ignored it should be removed`
      ]);
    }
  
    let output = table(outputTable);

    const accuracyStr = Number((this.getAcurracy()) * 100).toFixed(1);
    const coverageStr = Number((this.getCoverage()) * 100).toFixed(1);

    const summary = [
      `\n\n${FN.length} rules are available`,
      `${FP.length} rules are ignored`,
      `Total: ${FN.length +  FP.length}`,
      `Accuracy: ${accuracyStr}%  (${this.enabled.length - FP.length} / ${this.enabled.length})`,
      `Coverage: ${coverageStr}% (${this.followed.length - FN.length} / ${this.followed.length})`
    ];
    output += summary.join('\n');
    return output;
  }
}

export function outputRuleResultTable (rules: RuleMap[], projects: string[], outputPath: string): void {
  const lines: Array<Array<string|number >> = [
    [
      'Project',
      'Followed',
      'Unfollowed',
      'Configured',
      'Unconfigured',
      'FalsePositive',
      'FalseNegative',
      'Accuracy',
      'Coverage']
  ];
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];
    const project = projects[index];
    const line = [
      project,
      rule.followed.length,
      rule.unfollowed.length,
      rule.enabled.length,
      rule.disabled.length,
      rule.getFalsePositive().length,
      rule.getFalseNegative().length,
      rule.getAcurracy().toFixed(3),
      rule.getCoverage().toFixed(3)
    ];
    lines.push(line);
  }
  csv.stringify(lines, (_error, output) => {
    if (output) {
      fs.writeFile(outputPath, output, () => {
        console.log(`output on ${outputPath}`);
      });
    }
  });
}

export function makeCommonRules (rulesA: string[], rulesB: string[]): string[] {
  const originalSet = new Set(rulesA);
  const diff = new Set([...rulesB].filter(x => originalSet.has(x)));
  return Array.from(diff);
}

export function makeAMinusBRules (rulesA: string[], rulesB: string[]): string[] {
  const bSet = new Set(rulesB);
  const diff = new Set([...rulesA].filter(x => !bSet.has(x)));
  return Array.from(diff);
}
