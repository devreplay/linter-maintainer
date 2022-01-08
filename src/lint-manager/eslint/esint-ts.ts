import { ESLintJSManager } from './esint-js';

export class ESLintTSManager extends ESLintJSManager {
    constructor (projectPath: string){
        super(projectPath);
        this.extension = '.ts';
    }
}
