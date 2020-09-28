// import { SplitedRules, outputRuleResultTable } from './rules'
import * as fs from 'fs'
import * as path from 'path'

import * as gitminer from './gitminer'
import * as eslint from './esint_manager'
// import * as extend from './ruleExtends'
import * as util from './util'

interface Warnings {
  version: string,
  warnings: string[]
}

export async function evaluate4Projects(rootPath: string, projects: string[]): Promise<void> {
  const projectPathes = projects.map(project => { return path.join(rootPath, project) })
  for (const projectPath of projectPathes) {
    await evaluateAndOutput(projectPath)
  }
}

export async function evaluateAndOutput(targetProject: string): Promise<void> {
  // const evaluateResult = await evaluateZenLintResult(targetProject, extend.ESAll)
  const evaluateResult = await evaluateZenLintResult_config(targetProject)
  try {
    fs.writeFileSync(`results/warnings/${path.basename(targetProject)}_config.json`,
                     JSON.stringify(evaluateResult, undefined, 2))
  } catch(err) {
    console.log(err)
  }
}

export async function evaluateZenLintResult (projectpath: string, target_rules: string[]): Promise<Warnings[]> {
  const project = new gitminer.Project(projectpath)
  // project.cloneProject()
  const ruleSets: Warnings[] = []
  // プロジェクトのタグリストを得る
  const tags: string[] = await project.getTagList()

  // メジャーごと，マイナーごと，メンテナンスごとに更新した場合のブレ（ルールの変更量）を見る
  // 仮設：マイナーごとに更新すれば次のマイナーでも同じルールが使える
  // メジャーごとでもやれば次のメジャーまでのブレは少なくなる
  // ブレの多さで評価する
  let oldTag = ''
  for (const tag of tags) {
    // checkoutする
    await project.checkout(tag)
    const files = eslint.filterFiles(util.getAllFiles(projectpath))
    // console.log(files)
    // console.log(tag)
    // メジャー，マイナー，パッチタグの区別をする
    const tag_kind = makeTagDiffKind(tag, oldTag)
    if (tag_kind === versionSize.MAJOR) {
      console.log(`Major diff ${oldTag} to ${tag}`)
    } else if (tag_kind === versionSize.MINOR) {
      console.log(`Minor diff ${oldTag} to ${tag}`)
    } else if (tag_kind === versionSize.MAINTENANCE) {
      console.log(`Maintenance diff ${oldTag} to ${tag}`)
    }
    // # ZenLintを実行し，configファイルを生成する
    
    const rules = eslint.getRulesFromExtends(target_rules, projectpath, false)
    // const configured_rules = eslint.getRulesFromFile(projectpath).ruleIds
    // ルールリストにルールを足す
    const warnings = eslint.executeESLint(files, rules.engine)
    // const warnResult: Warnings = {warnings, version: tag}
    const warnResult: Warnings = {warnings: warnings, version: tag}

    ruleSets.push(warnResult)
    oldTag = tag
  }

  return ruleSets
}

async function evaluateZenLintResult_config (projectpath: string) {
  const project = new gitminer.Project(projectpath)
  // project.cloneProject()
  const ruleSets: Warnings[] = []
  // プロジェクトのタグリストを得る
  const tags: string[] = await project.getTagList()

  // メジャーごと，マイナーごと，メンテナンスごとに更新した場合のブレ（ルールの変更量）を見る
  // 仮設：マイナーごとに更新すれば次のマイナーでも同じルールが使える
  // メジャーごとでもやれば次のメジャーまでのブレは少なくなる
  // ブレの多さで評価する
  let oldTag = ''
  for (const tag of tags) {
    // checkoutする
    await project.checkout(tag)
    // console.log(files)
    // console.log(tag)
    // メジャー，マイナー，パッチタグの区別をする
    const tag_kind = makeTagDiffKind(tag, oldTag)
    if (tag_kind === versionSize.MAJOR) {
      console.log(`Major diff ${oldTag} to ${tag}`)
    } else if (tag_kind === versionSize.MINOR) {
      console.log(`Minor diff ${oldTag} to ${tag}`)
    } else if (tag_kind === versionSize.MAINTENANCE) {
      console.log(`Maintenance diff ${oldTag} to ${tag}`)
    }
    // # ZenLintを実行し，configファイルを生成する
    let configured_rules: string[]
    try {
      configured_rules = eslint.getRulesFromFile(projectpath).ruleIds
    } catch (error) {
      configured_rules = []
    }
    // const configured_rules = eslint.getRulesFromFile(projectpath).ruleIds
    const warnResult: Warnings = {warnings: configured_rules, version: tag}

    ruleSets.push(warnResult)
    oldTag = tag
  }

  return ruleSets
}

const versionSize = {
  MAJOR: 0,
  MINOR: 1,
  MAINTENANCE: 2
}

function makeTagDiffKind (tag_a: string, tag_b: string) {
  // # 両方のタグがX.Y.Zの形になっているかチェック
  // # なっていればXをメジャーバージョン 0
  // # Yをマイナーバージョン: 1
  // # Zをメンテナンスバージョン: 2
  // 失敗なら-1
  const partsA = gitminer.parseTagVersion(tag_a)
  const partsB = gitminer.parseTagVersion(tag_b)

  if (partsA.length !== partsB.length) {
    return -1
  }

  let diff = 0
  let diff_index = 0
  for (let l = Math.max(partsA.length, partsB.length); diff_index < l; diff_index++) {
    const a = partsA[diff_index]
    const b = partsB[diff_index]
    diff = a === b ? 0 : a > b ? 1 : -1;
    if (diff) {
      return diff_index
    }
  }
  return -1
}
