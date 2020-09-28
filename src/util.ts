import * as fs from 'fs'
import path = require('path');

export function makeCommonRules (rules1: string[], rules2: string[]): string[] {
  const originalSet = new Set(rules1)
  const diff = new Set([...rules2].filter(x => originalSet.has(x)))
  return Array.from(diff)
}

export function makeUncommonRules (availableRules: string[], warnedRules: string[]): string[] {
  const warnedSet = new Set(warnedRules)
  const diff = new Set([...availableRules].filter(x => !warnedSet.has(x)))
  return Array.from(diff)
}

export function exists (file: string): boolean {
  const stat = fs.statSync(file)
  return stat.isFile()
}

export function getAllFiles(dirName: string): string[] {
  const dirents = fs.readdirSync(dirName, { withFileTypes: true });
  const filesNames: string[] = [];
  for (const files of dirents) {
      if (files.isDirectory()){
          filesNames.push(...getAllFiles(path.join(dirName, files.name)));
      } else {
          filesNames.push(path.join(dirName, files.name));
      }
  }
  return filesNames;
}