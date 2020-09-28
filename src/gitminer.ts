import * as git from 'simple-git/promise'

export class Project {
  path: string
  localGit: git.SimpleGit

  constructor(path: string) {
    this.path = path
    this.localGit = git(this.path)
  }
  
  async getChangedFilesWithHEAD (length: number, length2?: number): Promise<string[]> {  
    const diffLength = []
    if (length2 !== undefined) {
      diffLength.push(`HEAD~${length2}..HEAD~${length}`)
    } else {
      diffLength.push(`HEAD~${length}`)
    }
    const diff = await this.localGit.diffSummary(diffLength)
    return diff.files
      .map(file => { return file.file })
  }

  async checkout(tag: string): Promise<void> {
    try {
      await this.localGit.checkout(tag)
    } catch (error) {
      console.log(error)
    }
  }

  async checkOutToHEAD (): Promise<void> {
    try {
      await this.localGit.checkout('master')
    } catch (error) {
      console.log(error)
    }
  }
  
  async checkOutWithHEAD (length: number): Promise<void> {
    await this.localGit.checkout(`HEAD~${length}`)
  }
  
  async getTagList (): Promise<string[]> {
    // タグを取得しソートする
    const tags = (await this.localGit.tag()).split('\n').map(trimmed)
    tags.sort(function (tagA, tagB) {
      const partsA = tagA.split('.');
      const partsB = tagB.split('.');
      for (let i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
        const diff = sorted(toNumber(partsA[i]), toNumber(partsB[i]));
        if (diff) {
          return diff;
        }
      }
      return 0
    })
    return tags
  }

  async getfiles(index: string): Promise<string>{
    return await this.localGit.catFile(['-p', index])
  }
}

export function parseTagVersion(tag: string): number[] {
  return tag.split('.').map(toNumber)
}

export async function getChangedFilesWithHEAD (dirPath: string, length: number, length2?: number): Promise<string[]> {
  const localGit: git.SimpleGit = git(dirPath)

  const diffLength = []
  if (length2 !== undefined) {
    diffLength.push(`HEAD~${length2}..HEAD~${length}`)
  } else {
    diffLength.push(`HEAD~${length}`)
  }
  const diff = await localGit.diffSummary(diffLength)
  return diff.files
    .map(file => { return file.file })
}

export async function checkOutToHEAD (dirPath: string): Promise<void> {
  const localGit: git.SimpleGit = git(dirPath)
  try {
    await localGit.checkout('master')
  } catch (error) {
    console.log(error)
    console.log(dirPath)
  }
}

export async function checkOutWithHEAD (dirPath: string, length: number): Promise<void> {
  const localGit: git.SimpleGit = git(dirPath)
  await localGit.checkout(`HEAD~${length}`)
}

export function cloneProject(): number {
  return 0
}

function trimmed(input: string) {
  return input.trim();
}

function sorted(a: number, b: number) {
  return a === b ? 0 : a > b ? 1 : -1;
}


function toNumber(input: string | undefined) {
  if (typeof input === 'string') {
     return parseInt(input.replace(/^\D+/g, ''), 10) || 0;
  }

  return 0;
}