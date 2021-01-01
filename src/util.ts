import * as fs from 'fs';
import path = require('path');

export function exists (file: string): boolean {
  const stat = fs.statSync(file);
  return stat.isFile();
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

export function tryReadFile (filename: string): string | undefined {
  if (!exists(filename)) {
    throw new Error(`Unable to open file: ${filename}`);
  }
  const buffer = Buffer.allocUnsafe(256);
  const fd = fs.openSync(filename, 'r');
  try {
    fs.readSync(fd, buffer, 0, 256, 0);
    if (buffer.readInt8(0) === 0x47 && buffer.readInt8(188) === 0x47) {
      console.log(`${filename}: ignoring MPEG transport stream\n`);

      return undefined;
    }
  } finally {
    fs.closeSync(fd);
  }

  return fs.readFileSync(filename, 'utf8');
}
