import {CLIEngine, Linter} from "eslint";
import * as fs from "fs";
import * as path from "path";

import * as gitminer from "./gitminer";
import {SplitedRules} from "./rules";
import * as extend from "./ruleExtends";
import {exists, makeUncommonRules} from "./util";

export interface Rules {
  engine: CLIEngine
  ruleIds: string[]
}

interface RuleIds {
  recommend: string[]
  all: string[]
  standard: string[]
  benchmark?: string[]
  approach?: string[]
}


export async function makeRuleSets (targetProject: string, targetFiles: string[], currentIndex: number, oldIndex: number): Promise<RuleIds> {

    const project = new gitminer.Project(targetProject);
    await project.checkOutToHEAD();

    const ruleIds: RuleIds = {
        "recommend": getRulesFromExtends(
            extend.ESRecommended,
            targetProject,
            false
        ).ruleIds,
        "standard": getRulesFromExtends(
            extend.ESStandard,
            targetProject,
            false
        ).ruleIds,
        "all": getRulesFromExtends(
            extend.ESAll,
            targetProject,
            true
        ).ruleIds
    },

        allRule = getRulesFromExtends(
            extend.ESAll,
            targetProject,
            true,
            false
        ),
        currentStatus = await getOldStatus(
            targetProject,
            currentIndex,
            targetFiles,
            allRule
        );
    if (currentStatus !== undefined) {

        ruleIds.benchmark = currentStatus.followed;

        const oldStatus = await getOldStatus(
            targetProject,
            oldIndex,
            targetFiles,
            allRule
        );
        if (oldStatus !== undefined) {

            // RuleIds.approach = compareConfig(currentStatus, oldStatus).getTruePositive()
            ruleIds.approach = Array.from(new Set([
                ...compareConfig(
                    currentStatus,
                    oldStatus
                ).getTruePositive(),
                ...currentStatus.configured
            ]));

        }

    }
    await project.checkOutToHEAD();

    return ruleIds;

}

export async function getOldStatus (targetProject: string, changeLength: number, targetFiles: string[], rules: Rules): Promise<SplitedRules | undefined> {

    const project = new gitminer.Project(targetProject);
    await project.checkOutWithHEAD(changeLength);
    const status = getRuleStatus(
        targetProject,
        targetFiles,
        rules
    );
    await project.checkOutToHEAD();
    return status;

}

/*
 * Async function getSlideRules (targetProject: string, changeLength: number, targetFiles: string[], rules: Rules): Promise<SplitedRules> {
 *   let status = rules.ruleIds
 *   await gitminer.checkOutToHEAD(targetProject)
 *   for (let index = 0; index < changeLength; index++) {
 *     console.log(index)
 *     const oldRules = await getOldStatus(targetProject, index, targetFiles, rules)
 *     if (oldRules !== undefined) {
 *       status = makeCommonRules(status, oldRules.followed)
 *     }
 *   }
 *   await gitminer.checkOutToHEAD(targetProject)
 *   const currentRules = new SplitedRules(status, makeFollowedRules(rules.ruleIds, status), status)
 */

/*
 *   Return currentRules
 * }
 */

export function getRuleStatus (project: string, targetFiles: string[], rules: Rules): SplitedRules | undefined {

    const configFile = getConfigPath(project);

    if (configFile === undefined) {

        return undefined;

    }

    const configuredRules = getRulesFromFile(project),

        unfollowedRules = executeESLint(
            targetFiles,
            rules.engine
        ),
        followedRules = makeUncommonRules(
            rules.ruleIds,
            unfollowedRules
        ),

        splitedRules = new SplitedRules(
            followedRules,
            unfollowedRules,
            configuredRules.ruleIds
        );
    return splitedRules;

}

function getConfigPath (projectPath: string): string|undefined {

    const filenames = fs.readdirSync(projectPath),
        lintPath = filenames.filter((filename) => filename.includes("eslintrc"));
    if (lintPath.length > 0) {

        return lintPath[0];

    }

    return undefined;


}

export function compareConfig (currentRules: SplitedRules, prevRules: SplitedRules): SplitedRules {

    return new SplitedRules(
        currentRules.followed,
        currentRules.unfollowed,
        prevRules.followed
    );

}

export function executeESLint (targetFiles: string[], cli: CLIEngine): string[] {

    const files = targetFiles.filter((file) => fs.existsSync(file)),

    reports = cli.executeOnFiles(files),
    ruleIds: string[] = [];
    reports.results.forEach((report) => {

        const {messages} = report;
        messages.forEach((message) => {

            if (message.ruleId !== null) {

                ruleIds.push(message.ruleId);

            }

        });

    });
    return Array.from(new Set(ruleIds));

}

export function findESlint (rootPath: string): string {

    const {platform} = process;
    if (platform === "win32" && exists(path.join(
        rootPath,
        "node_modules",
        ".bin",
        "eslint.cmd"
    ))) {

        return path.join(
            ".",
            "node_modules",
            ".bin",
            "eslint.cmd"
        );

    } else if ((platform === "linux" || platform === "darwin") && exists(path.join(
        rootPath,
        "node_modules",
        ".bin",
        "eslint"
    ))) {

        return path.join(
            ".",
            "node_modules",
            ".bin",
            "eslint"
        );

    }
    return "eslint";

}

export function getRulesFromFile (cwd: string, all?: boolean): Rules {

    // Search config file
    const configFile = searchConfigFile(cwd),
        config: CLIEngine.Options = {
            cwd,
            configFile
        },

        engine = new CLIEngine(config),
        rules = engine.getRules(),
        ruleIds: string[] = [];
    rules.forEach((rule, key) => {

        if (all === true || rule.meta?.docs?.recommended === true) {

            ruleIds.push(key);

        }

    });
    return {engine,
        ruleIds};

}

function searchConfigFile (cwd: string): string {

    const files: string[] = [];
    fs.readdirSync(cwd).forEach((file) => {

        if (!file.includes("eslintrc")) {

            return;

        }
        files.push(file);

    });

    if (files.length > 0) {

        return files[0];

    }
    return "";

}

export function getRulesFromExtends (extendsName: string | string[], projectPath: string, all?: boolean, typescript?: boolean): Rules {

    let config: Linter.BaseConfig;

    /*
     * TODO: プロジェクトにeslintrcがあればそこからenvを生成する,なければpackage.jsonから判断する
     * TODO: プロジェクトのpluginsを見て，取得できそうないものは消す
     * TODO: 新しいルールリストとプロジェクトが自動生成したルールリストを分ける
     */
    if (typescript === true) {

        config = {
            "env": {
                "browser": true,
                "es6": true,
                "jest": true
            },
            "parser": "@typescript-eslint/parser",
            "plugins": ["@typescript-eslint"],
            "extends": extendsName,
            "parserOptions": {
                "tsconfigRootDir": projectPath,
                "project": ["/tsconfig.json"],
                "ecmaVersion": 2018,
                "sourceType": "module"
            }
        };

    } else {

        config = {
            "extends": extendsName,
            "parserOptions": {
                "ecmaVersion": 2018,
                "sourceType": "module"
            }
        };

    }

    const engine = new CLIEngine({"baseConfig": config,
            "useEslintrc": false}),
        rules = engine.getRules(),
        ruleIds: string[] = [];
    rules.forEach((rule, key) => {

        if (all === true || rule.meta?.docs?.recommended === true) {

            ruleIds.push(key);

        }

    });
    return {engine,
        ruleIds};

}

export function makeConfig (rules: string[], projectPath: string, typescript?: boolean): Linter.BaseConfig<Linter.RulesRecord> {

    const config: Linter.BaseConfig<Linter.RulesRecord> = {
        "rules": {},
        "env": {},
        "parserOptions": {},
        "extends": []
    };

    if (typescript === true) {

        config.env = {
            "browser": true,
            "es6": true,
            "jest": true
        };
        config.parser = "@typescript-eslint/parser";
        config.plugins = ["@typescript-eslint"];
        config.parserOptions = {
            "tsconfigRootDir": projectPath,
            "project": ["/tsconfig.json"],
            "ecmaVersion": 11,
            "sourceType": "module"
        };

    } else {

        config.parserOptions = {
            "ecmaVersion": 11,
            "sourceType": "module"
        };
        const newRule: Linter.RulesRecord = rules.reduce(
            (a, x) => ({...a,
                [x]: "error"}),
            {}
        );

        config.rules = newRule;

    }
    return config;

}

export function filterFiles (files: string[], isTS?: boolean): string[] {

    const jsPath = ".js",
        tsPath = ".ts";

    if (isTS === true) {

        return files.filter((file) => file.endsWith(tsPath));

    }
    return files.filter((file) => file.endsWith(jsPath));

}
