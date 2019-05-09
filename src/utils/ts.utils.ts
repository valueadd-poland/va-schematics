import { DirEntry, SchematicsException, Tree } from '@angular-devkit/schematics';
import { normalize } from 'path';
import * as ts from 'typescript';

export function readIntoSourceFile(host: Tree, filePath: string): ts.SourceFile {
  const text = host.read(filePath);
  if (text === null) {
    throw new SchematicsException(`File ${filePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
}

export function showTree(node: ts.Node, indent: string = '    '): void {
  console.log(indent + ts.SyntaxKind[node.kind]);

  if (node.getChildCount() === 0) {
    console.log(indent + '    Text: ' + node.getText());
  }

  for (const child of node.getChildren()) {
    showTree(child, indent + '    ');
  }
}

export function createFilesArrayFromDir(dir: DirEntry): string[] {
  const dirFiles = dir.subfiles.map(subFile => normalize(`${dir.path}/${subFile}`));

  dir.subdirs.forEach(subDir => {
    dirFiles.push(...createFilesArrayFromDir(dir.dir(subDir)));
  });

  return dirFiles;
}

export function findDeclarationNodeByName<T extends ts.Node>(
  node: ts.Node,
  name: string
): T | null {
  const n = (node as any).name;

  if (n && n.escapedText === name) {
    return node as T;
  }

  const children = node.getChildren();
  for (let i = 0; i < children.length; i++) {
    const foundNode = findDeclarationNodeByName(children[i], name);

    if (foundNode) {
      return foundNode as T;
    }
  }

  return null;
}

export function findDeclarationNodeByPartialName<T extends ts.Node>(
  node: ts.Node,
  name: string
): T | null {
  const n = (node as any).name;

  if (n && n.escapedText.indexOf(name) !== -1) {
    return node as T;
  }

  const children = node.getChildren();
  for (let i = 0; i < children.length; i++) {
    const foundNode = findDeclarationNodeByPartialName(children[i], name);

    if (foundNode) {
      return foundNode as T;
    }
  }

  return null;
}

export function guessType(value: string): string {
  if (value.includes('false') || value.includes('true')) {
    return 'boolean';
  }

  if (value.match(/^\d+$/)) {
    return 'number';
  }

  if (value === 'null' || value === 'undefined' || value === 'never') {
    return value;
  }

  return 'any';
}

export function parseType(type: string): string[] {
  const types: string[] = [];
  const generics = type.split('<').map(t => t.replace('>', ''));

  generics.forEach(g => {
    types.push(...g.split('|'));
  });

  return types.map(t => t.trim());
}

export function isBaseType(type: string): boolean {
  return (
    [
      'boolean',
      'boolean[]',
      'number',
      'number[]',
      'null',
      'null[]',
      'undefined',
      'undefined[]',
      'string',
      'string[]',
      'any',
      'any[]'
    ].indexOf(type) !== -1
  );
}

export function parseInterfaceMembers(
  members: ts.NodeArray<ts.TypeElement>
): Array<[ts.Identifier, ts.Node]> {
  const props: Array<[ts.Identifier, ts.Node]> = [];

  members.forEach(member => {
    const nodes = member
      .getChildren()
      .filter(
        node => node.kind !== ts.SyntaxKind.QuestionToken && node.kind !== ts.SyntaxKind.ColonToken
      ) as [ts.Identifier, ts.Node];

    props.push(nodes);
  });

  return props;
}
