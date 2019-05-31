import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, NoopChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { getSourceNodes, insert } from './ast.utils';
import { parseType, readIntoSourceFile } from './ts.utils';

export interface CtorArgument {
  accessModifier: '' | 'private' | 'protected' | 'public';
  name: string;
  type: string;
}

function findSuccessor(node: ts.Node, searchPath: ts.SyntaxKind[]): ts.Node | undefined {
  let children = node.getChildren();
  let next: ts.Node | undefined;

  for (const syntaxKind of searchPath) {
    next = children.find(n => n.kind === syntaxKind);
    if (!next) {
      return undefined;
    }
    children = next.getChildren();
  }

  return next;
}

export function insertConstructorArguments(
  host: Tree,
  filePath: string,
  ctorArguments: CtorArgument[]
): void {
  if (!ctorArguments.length) {
    return;
  }

  const sourceFile = readIntoSourceFile(host, filePath);
  const nodes = getSourceNodes(sourceFile);
  const ctorNode = nodes.find(n => n.kind === ts.SyntaxKind.Constructor);

  if (!ctorNode) {
    insert(host, filePath, [createConstructorForInjection(filePath, sourceFile, ctorArguments)]);
  } else {
    insert(host, filePath, [
      addConstructorArgument(filePath, ctorNode, ctorArguments.shift() as CtorArgument)
    ]);
    insertConstructorArguments(host, filePath, ctorArguments);
  }
}

export function addConstructorArgument(
  filePath: string,
  ctorNode: ts.Node,
  ctorArgument: CtorArgument
): Change {
  const siblings = ctorNode.getChildren();
  const parameterListNode = siblings.find(n => n.kind === ts.SyntaxKind.SyntaxList);

  if (!parameterListNode) {
    throw new SchematicsException(`expected constructor in ${filePath} to have a parameter list`);
  }

  const parameterNodes = parameterListNode.getChildren();
  const paramType = parseType(ctorArgument.type)[0];
  const paramNode = parameterNodes.find(p => {
    const typeNode = findSuccessor(p, [ts.SyntaxKind.TypeReference, ts.SyntaxKind.Identifier]);
    if (!typeNode) {
      return false;
    }

    return typeNode.getText() === paramType;
  });

  // There is already a respective constructor argument --> nothing to do for us here ...
  if (paramNode) {
    return new NoopChange();
  }

  // Is the new argument the first one?
  if (!paramNode && parameterNodes.length === 0) {
    const toAdd = `${ctorArgument.accessModifier} ${ctorArgument.name}: ${ctorArgument.type}`;

    return new InsertChange(filePath, parameterListNode.pos, toAdd);
  } else if (!paramNode && parameterNodes.length > 0) {
    const toAdd = `, ${ctorArgument.accessModifier} ${ctorArgument.name}: ${ctorArgument.type}`;
    const lastParameter = parameterNodes[parameterNodes.length - 1];
    return new InsertChange(filePath, lastParameter.end, toAdd);
  }

  return new NoopChange();
}

export function createConstructorForInjection(
  filePath: string,
  sourceFile: ts.SourceFile,
  ctorArguments: CtorArgument[] = []
): Change {
  const nodes = getSourceNodes(sourceFile);
  const classNode = nodes.find(n => n.kind === ts.SyntaxKind.ClassKeyword);

  if (!classNode) {
    throw new SchematicsException(`expected class in ${filePath}`);
  }

  if (!classNode.parent) {
    throw new SchematicsException(`expected constructor in ${filePath} to have a parent node`);
  }

  let siblings = classNode.parent.getChildren();
  const classIndex = siblings.indexOf(classNode);

  siblings = siblings.slice(classIndex);

  const classIdentifierNode = siblings.find(n => n.kind === ts.SyntaxKind.Identifier);

  if (!classIdentifierNode) {
    throw new SchematicsException(`expected class in ${filePath} to have an identifier`);
  }

  // Find opening curly braces (FirstPunctuation means '{' here).
  const curlyNodeIndex = siblings.findIndex(n => n.kind === ts.SyntaxKind.FirstPunctuation);

  siblings = siblings.slice(curlyNodeIndex);

  const listNode = siblings.find(n => n.kind === ts.SyntaxKind.SyntaxList);

  if (!listNode) {
    throw new SchematicsException(`expected first class in ${filePath} to have a body`);
  }

  const ctorArgumentsToAdd = ctorArguments
    .map(cp => `${cp.accessModifier} ${cp.name}: ${cp.type}`)
    .join(', ');
  const toAdd = `
  constructor(${ctorArgumentsToAdd}) {}
`;
  return new InsertChange(filePath, listNode.getStart(), toAdd);
}
