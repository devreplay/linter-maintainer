import * as table from 'text-table';
import * as csv from 'csv';
import * as fs from 'fs';

export class RuleMap {
  all: string[]
  followed: string[]
  unfollowed: string[]
  enabled: string[]
  disabled: string[]

  constructor (
    all: string[],
    unfollowed: string[],
    enabled: string[]
  ) {
    this.all = all;
    this.unfollowed = unfollowed;
    this.followed = makeUncommonRules(this.all, this.unfollowed);
    this.enabled = enabled;
    this.disabled = makeUncommonRules([...this.followed, ...this.unfollowed], this.enabled);
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

    const summary = [
      `\n\n${FN.length} rules are available`,
      `${ FP.length} rules are ignored`,
      `Total: ${FN.length +  FP.length}`,
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

export function makeCommonRules (rules1: string[], rules2: string[]): string[] {
  const originalSet = new Set(rules1);
  const diff = new Set([...rules2].filter(x => originalSet.has(x)));
  return Array.from(diff);
}

export function makeUncommonRules (availableRules: string[], warnedRules: string[]): string[] {
  const warnedSet = new Set(warnedRules);
  const diff = new Set([...availableRules].filter(x => !warnedSet.has(x)));
  return Array.from(diff);
}
