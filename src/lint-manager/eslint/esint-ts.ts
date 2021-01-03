import { ESLintJSManager } from './esint-js';

export class ESLintTSManager extends ESLintJSManager {
    constructor (projectPath: string){
        super(projectPath);
        this.ESRecommended = ['eslint:recommended', 'plugin:@typescript-eslint/recommended'];
        this.ESAll = ['eslint:all', 'plugin:@typescript-eslint/all'];
        this.extension = '.ts';
        this.config = {
            'rules': {},
            'env': {
                'browser': true,
                'es6': true,
                'jest': true
            },
            'plugins': ['@typescript-eslint'],
            'parser': '@typescript-eslint/parser',
            'parserOptions': {
                'tsconfigRootDir': this.projectPath,
                'project': ['tsconfig.json'],
                'ecmaVersion': 11,
                'sourceType': 'module'
            },
            'extends': []
        };
        const target_rules = this.selectExtends(true);
        const all_rules = this.getRulesFromExtends(target_rules);
        this.engine = all_rules.engine;
    }
}