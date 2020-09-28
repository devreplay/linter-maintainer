import * as table from 'text-table'
import * as csv from 'csv'
import * as fs from 'fs'
import { makeCommonRules, makeUncommonRules } from './util'

export class SplitedRules {
  followed: string[]
  unfollowed: string[]
  configured: string[]
  unconfigured: string[]

  constructor (
    followed: string[],
    unfollowed: string[],
    configured: string[]
  ) {
    this.followed = followed
    this.unfollowed = unfollowed
    this.configured = configured
    this.unconfigured = makeUncommonRules([...followed, ...unfollowed], this.configured)
  }

  getTruePositive (): string[] {
    return makeCommonRules(this.configured, this.followed)
  }

  getFalsePositive (): string[] {
    return makeCommonRules(this.configured, this.unfollowed)
  }

  getTrueNegative (): string[] {
    return makeCommonRules(this.unconfigured, this.unfollowed)
  }

  getFalseNegative (): string[] {
    return makeCommonRules(this.followed, this.unconfigured)
  }

  getAcurracy (): number {
    return (this.configured.length - this.getFalsePositive().length) / this.configured.length
  }

  getCoverage (): number {
    return (this.followed.length - this.getFalseNegative().length) / this.followed.length
  }

  outputSummary (): void {
    const lintOuputs: string[][] = []

    lintOuputs.push(['Followed', this.followed.length.toString()])
    lintOuputs.push(['Unfollowed', this.unfollowed.length.toString()])

    lintOuputs.push(['Configured', this.configured.length.toString()])
    lintOuputs.push(['Unconfigured', this.unconfigured.length.toString()])

    lintOuputs.push(['False Positive', this.getFalsePositive.length.toString()])
    lintOuputs.push(['False Negative', this.getFalseNegative.length.toString()])

    lintOuputs.push(['Accuracy', this.getAcurracy().toFixed(3)])
    lintOuputs.push(['Coverage', this.getCoverage().toFixed(3)])
    const output = table(lintOuputs)
    console.log()
    console.log(output)
  }
}

export function outputRuleResultTable (rules: SplitedRules[], projects: string[], outputPath: string): void {
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
  ]
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index]
    const project = projects[index]
    const line = [
      project,
      rule.followed.length,
      rule.unfollowed.length,
      rule.configured.length,
      rule.unconfigured.length,
      rule.getFalsePositive().length,
      rule.getFalseNegative().length,
      rule.getAcurracy().toFixed(3),
      rule.getCoverage().toFixed(3)
    ]
    lines.push(line)
  }
  csv.stringify(lines, (_error, output) => {
    if (output) {
      fs.writeFile(outputPath, output, () => {
        console.log(`output on ${outputPath}`)
      })
    }
  })
}
