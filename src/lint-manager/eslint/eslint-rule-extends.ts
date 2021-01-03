import { CLIEngine, Linter } from 'eslint';

export const ESRecommended = [
  'eslint:recommended'
];

export const ESAll = [
  'eslint:all'
];

export const ESStandard = [
  'standard'
];

export const TSRecommended = [
  'eslint:recommended',
  'plugin:@typescript-eslint/recommended'
];

export const TSAll = [
  'eslint:all',
  'plugin:@typescript-eslint/all'
];

export const TSStandard = [
  'standard-with-typescript'
];

export function selectExtends (isAll?: boolean): string[] {
  if (isAll === true) {
    return ESAll;
  }
  return ESRecommended;
}

export function getRulesFromExtends (extendsName: string | string[], projectPath: string): {
  engine: CLIEngine
  ruleIds: string[]
} {
  const config: Linter.BaseConfig = {
    env: {
      browser: true,
      es6: true,
      jest: true
    },
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint'
    ],
    extends: extendsName,
    parserOptions: {
      tsconfigRootDir: projectPath,
      project: ['/tsconfig.json'],
      ecmaVersion: 2018,
      sourceType: 'module'
    }
  };

  const engine = new CLIEngine({ baseConfig: config, useEslintrc: false });
  const rules = engine.getRules();
  const ruleIds: string[] = [];
  rules.forEach((_rule, key) => {
    // if (all || rule.meta?.docs?.recommended){
    ruleIds.push(key);
    // }
  });
  return { engine, ruleIds };
}
