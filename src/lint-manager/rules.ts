import * as table from 'text-table';
import * as csv from 'csv';
import * as fs from 'fs';
import { makeCommonRules, makeUncommonRules } from '../util';

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

  outputSummary (): void {
    const lintOuputs: string[][] = [];

    lintOuputs.push(['Followed', this.followed.length.toString()]);
    lintOuputs.push(['Unfollowed', this.unfollowed.length.toString()]);

    lintOuputs.push(['Configured', this.enabled.length.toString()]);
    lintOuputs.push(['Unconfigured', this.disabled.length.toString()]);

    lintOuputs.push(['False Positive', this.getFalsePositive.length.toString()]);
    lintOuputs.push(['False Negative', this.getFalseNegative.length.toString()]);

    lintOuputs.push(['Accuracy', this.getAcurracy().toFixed(3)]);
    lintOuputs.push(['Coverage', this.getCoverage().toFixed(3)]);
    const output = table(lintOuputs);
    console.log();
    console.log(output);
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
