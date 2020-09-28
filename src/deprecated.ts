// import { CLIEngine, Linter } from 'eslint';

// export function makeAllCLIEngine(): CLIEngine {
//     const config: CLIEngine.Options = {
//         cwd: process.cwd(),
//         configFile: './node_modules/eslint/conf/eslint-all.js',
//     };
//     const engine = new CLIEngine(config);

//     return engine;
// }

// export function makeRecommendedCLIEngine(): CLIEngine {
//     const config: CLIEngine.Options = {
//         cwd: process.cwd(),
//         configFile: './node_modules/eslint/conf/eslint-recommended.js',
//     };

//     const engine = new CLIEngine(config);
//     return engine;
// }

// interface extendsPath {
//     [key: string]: string;
// }

// function getRules(config: Linter.BaseConfig) {
//     const outRules = [];
//     if (config.rules !== undefined) {
//         const rules = config.rules;
//         for (const rule in rules) {
//             const ruleType = rules[rule];
//             if (ruleType !== 'off' && ruleType !== 0){
//                 outRules.push(rule);
//             }
//         }
//     }
//     return outRules;
// }

// export function getExtendsRule(extendsNames: string | string[]): string[] {
//     const rules: string[] = [];

//     const pluginList: extendsPath = {
//         'eslint:recommended': './node_modules/eslint/conf/eslint-all.js',
//         'eslint:all': './node_modules/eslint/conf/eslint-all.js',
//         'plugin:@typescript-eslint/all': './node_modules/@typescript-eslint/eslint-plugin/dist/configs/all.js',
//         'plugin:@typescript-eslint/recommended': './node_modules/@typescript-eslint/eslint-plugin/dist/configs/recommended.js'
//     };

//     if (typeof(extendsNames) === 'string' && pluginList[extendsNames] !== undefined) {
//         const extendsConfig: Linter.BaseConfig = require(pluginList[extendsNames]);
//         rules.push(...getRules(extendsConfig));
//     } else {
//         for (const extendsName of extendsNames) {
//             if (pluginList[extendsName]) {
//                 const extendsConfig: Linter.BaseConfig = require(pluginList[extendsName]);
//                 rules.push(...getRules(extendsConfig));
//             }
//         }
//     }

//     return rules;
// }
