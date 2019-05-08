import { Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import {
  createFilesArrayFromDir,
  findDeclarationNodeByName,
  isBaseType,
  readIntoSourceFile
} from './ts.utils';

export type NodeType = 'enum' | 'namespace' | 'class' | 'type' | 'const' | 'interface';

function isNodeType(node: ts.Node, type: NodeType): boolean {
  switch (type) {
    case 'enum':
      if (ts.isEnumDeclaration(node)) {
        return true;
      }
      break;
    case 'namespace':
      if (ts.isNamespaceExportDeclaration(node)) {
        return true;
      }
      break;
    case 'class':
      if (ts.isClassDeclaration(node)) {
        return true;
      }
      break;
    case 'type':
      if (ts.isTypeAliasDeclaration(node)) {
        return true;
      }
      break;
    case 'const':
      if (ts.isVariableDeclaration(node)) {
        return true;
      }
      break;
    case 'interface':
      if (ts.isInterfaceDeclaration(node)) {
        return true;
      }
      break;
  }

  return false;
}

function findNodesByTypeAndNameInTree(
  tree: Tree,
  type: NodeType | NodeType[],
  name: string
): string[] {
  const dir = tree.getDir('.');

  const tsFilePaths = createFilesArrayFromDir(dir).filter(
    filePath => !filePath.endsWith('spec.ts') && filePath.endsWith('.ts')
  );

  const nodes: any[] = [];

  tsFilePaths.forEach(tsFilePath => {
    const sourceFile = readIntoSourceFile(tree, tsFilePath);
    const tsNode = findDeclarationNodeByName(sourceFile, name);

    if (
      tsNode &&
      (Array.isArray(type) ? type.some(t => isNodeType(tsNode, t)) : isNodeType(tsNode, type))
    ) {
      nodes.push(tsFilePath);
    }
  });

  return nodes;
}

export function findTypeDeclarationFile(tree: Tree, type: string): string | null {
  if (isBaseType(type)) {
    return null;
  }

  return findNodesByTypeAndNameInTree(tree, ['class', 'interface', 'enum', 'type'], type)[0];
}
