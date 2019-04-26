import * as fs from 'fs';
import { ensureDirSync } from 'fs-extra';
import * as path from 'path';

export function writeToFile(filePath: string, str: string): void {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, str);
}

/**
 * This method is specifically for updating a JSON file using the filesystem
 *
 * @remarks
 * If you are looking to update a JSON file in a tree, look for ./ast-utils#updateJsonInTree
 * @param filePath Path of the JSON file on the filesystem
 * @param callback Manipulation of the JSON data
 */
export function updateJsonFile(filePath: string, callback: (a: any) => any): void {
  const json = readJsonFile(filePath);
  callback(json);
  writeJsonFile(filePath, json);
}

export function addApp(apps: any[] | undefined, newApp: any): any[] {
  if (!apps) {
    apps = [];
  }
  apps.push(newApp);

  apps.sort((a: any, b: any) => {
    if (a.name === '$workspaceRoot') {
      return 1;
    }
    if (b.name === '$workspaceRoot') {
      return -1;
    }
    if (a.main && !b.main) {
      return -1;
    }
    if (!a.main && b.main) {
      return 1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return -1;
  });
  return apps;
}

export function serializeJson(json: any): string {
  return `${JSON.stringify(json, null, 2)}\n`;
}

/**
 * This method is specifically for reading a JSON file from the filesystem
 *
 * @remarks
 * If you are looking to read a JSON file in a Tree, use ./ast-utils#readJsonInTree
 * @param filePath Path of the JSON file on the filesystem
 */
export function readJsonFile<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeJsonFile(filePath: string, json: any): void {
  writeToFile(filePath, serializeJson(json));
}

export function readCliConfigFile(): any {
  return readJsonFile('.angular-cli.json');
}

export function copyFile(file: string, target: string): void {
  const f = path.basename(file);
  const source = fs.createReadStream(file);
  const dest = fs.createWriteStream(path.resolve(target, f));
  source.pipe(dest);
  source.on('error', e => console.error(e));
}

export function directoryExists(name: string): boolean {
  try {
    return fs.statSync(name).isDirectory();
  } catch (e) {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

export function createDirectory(directoryPath: string): void {
  const parentPath = path.resolve(directoryPath, '..');
  if (!directoryExists(parentPath)) {
    createDirectory(parentPath);
  }
  if (!directoryExists(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }
}

export function renameSync(from: string, to: string, cb: (err: Error | null) => void): void {
  try {
    if (!fs.existsSync(from)) {
      throw new Error(`Path: ${from} does not exist`);
    } else if (fs.existsSync(to)) {
      throw new Error(`Path: ${to} already exists`);
    }

    // Make sure parent path exists
    const parentPath = path.resolve(to, '..');
    createDirectory(parentPath);

    fs.renameSync(from, to);
    cb(null);
  } catch (e) {
    cb(e);
  }
}
