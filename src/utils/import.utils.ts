import { normalize } from '@angular-devkit/core';
import { DirEntry, Tree } from '@angular-devkit/schematics';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import * as ts from 'typescript';
import { findNode, getSourceNodes, insert, insertImport, isImported } from './ast.utils';
import { createFilesArrayFromDir, isBaseType, parseType, readIntoSourceFile } from './ts.utils';

const cache: { [key: string]: string[] } = {};

export function findDeclarationFileByName(host: Tree, name: string): string[] {
  if (cache[name]) {
    return cache[name];
  }

  const files = createFilesArrayFromDir(host.getDir('.')).filter(
    f => !f.endsWith('spec.ts') && f.endsWith('.ts') && !f.startsWith('/node_modules')
  );

  const paths = files.filter(file => {
    const buff = host.read(file);
    if (buff) {
      const content = buff.toString('utf8');
      return (
        content.includes(`export class ${name} `) ||
        content.includes(`export class ${name}<`) ||
        content.includes(`export interface ${name} `) ||
        content.includes(`export interface ${name}<`) ||
        content.includes(`export type ${name} `) ||
        content.includes(`export type ${name}<`) ||
        content.includes(`export enum ${name} `) ||
        content.includes(`export namespace ${name} `) ||
        content.includes(`export function ${name}(`) ||
        content.includes(`export function ${name}<`) ||
        content.includes(`export function ${name} (`) ||
        content.includes(`export const ${name} =`) ||
        content.includes(`export let ${name} =`) ||
        content.includes(`export const ${name}=`) ||
        content.includes(`export let ${name}=`)
      );
    }

    cache[name] = [paths[0]];
    return false;
  });

  return paths;
}

function isExportedByBarrel(host: Tree, path: string, fileNameNoExt: string): boolean {
  const dir = host.getDir(path);
  const barrelFile = dir.subfiles.find(f => f.includes('index.ts') || f.includes('index.d.ts'));
  const barrelPath = barrelFile ? path + '/' + barrelFile : '';

  if (!barrelPath) {
    return false;
  }
  const barrelSourceFile = readIntoSourceFile(host, barrelPath);
  const barrelNodes = getSourceNodes(barrelSourceFile);
  const exportDeclarations = barrelNodes.filter(n => n.kind === ts.SyntaxKind.ExportDeclaration);

  for (let i = 0; i < exportDeclarations.length; i++) {
    const node = findNode(exportDeclarations[i], ts.SyntaxKind.StringLiteral) as ts.StringLiteral;
    const exportPath = node ? node.getText().slice(1, -1) : '';

    if (exportPath.endsWith(fileNameNoExt)) {
      return true;
    }

    const nestedDirPath = dir.path + '/' + exportPath.slice(2, exportPath.length);

    if (
      host.getDir(dir.path + '/' + exportPath) &&
      isExportedByBarrel(host, nestedDirPath, fileNameNoExt)
    ) {
      return true;
    }
  }

  return false;
}

function normalizeImport(importStr: string): string {
  if (importStr.endsWith('.d.ts')) {
    return importStr.slice(0, -5);
  }

  if (importStr.endsWith('.ts')) {
    return importStr.slice(0, -3);
  }

  return importStr;
}

export function buildImportPath(host: Tree, from: string, to: string): string {
  from = normalize(from);
  to = normalize(to);
  const fromParts = from.split('/');
  const toParts = to.split('/');
  const fileName = toParts[toParts.length - 1];
  const fileNameNoExt = fileName.slice(0, -3);
  const relativePath = buildRelativePath(from, to);
  const relativePathParts = relativePath.split('/');

  const dirPath = [...fromParts];
  dirPath.pop();
  let dir = host.getDir(dirPath.join('/'));

  for (let i = 0; i < relativePathParts.length - 1; i++) {
    dir =
      relativePathParts[i] === '..'
        ? (dir.parent as DirEntry)
        : host.getDir(dir.path + '/' + relativePathParts[i]);

    if (isExportedByBarrel(host, dir.path, fileNameNoExt)) {
      return normalizeImport(buildRelativePath(from, dir.path));
    }
  }

  return normalizeImport(relativePath);
}

export function insertCustomImport(
  host: Tree,
  filePath: string,
  symbolName: string,
  fileName: string
): void {
  insert(host, filePath, [
    insertImport(readIntoSourceFile(host, filePath), filePath, symbolName, fileName)
  ]);
}

export function insertTypeImport(host: Tree, filePath: string, type: string): void {
  const sourceFile = readIntoSourceFile(host, filePath);
  const types = parseType(type);

  types.forEach(t => {
    if (isBaseType(t)) {
      return;
    }
    t = t.split('[')[0];

    const typeFile = findDeclarationFileByName(host, t)[0];
    if (typeFile) {
      const importPath = buildImportPath(host, filePath, typeFile);
      if (!isImported(sourceFile, t, filePath)) {
        const importChange = insertImport(sourceFile, filePath, t, importPath);
        insert(host, filePath, [importChange]);
      }
    }
  });
}
