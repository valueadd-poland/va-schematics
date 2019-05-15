import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, NoopChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { getSourceNodes, insert, insertImport } from '../../../utils/ast.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { DataServiceMethodSchema } from '../data-service-method-schema.interface';

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

function addConstructorArgument(filePath: string, ctorNode: ts.Node): Change {
  const siblings = ctorNode.getChildren();
  const parameterListNode = siblings.find(n => n.kind === ts.SyntaxKind.SyntaxList);

  if (!parameterListNode) {
    throw new SchematicsException(`expected constructor in ${filePath} to have a parameter list`);
  }

  const parameterNodes = parameterListNode.getChildren();

  const paramNode = parameterNodes.find(p => {
    const typeNode = findSuccessor(p, [ts.SyntaxKind.TypeReference, ts.SyntaxKind.Identifier]);
    if (!typeNode) {
      return false;
    }
    return typeNode.getText() === 'HttpClient';
  });

  // There is already a respective constructor argument --> nothing to do for us here ...
  if (paramNode) {
    return new NoopChange();
  }

  // Is the new argument the first one?
  if (!paramNode && parameterNodes.length === 0) {
    const toAdd = `private http: HttpClient`;
    return new InsertChange(filePath, parameterListNode.pos, toAdd);
  } else if (!paramNode && parameterNodes.length > 0) {
    const toAdd = `,
    private http: HttpClient`;
    const lastParameter = parameterNodes[parameterNodes.length - 1];
    return new InsertChange(filePath, lastParameter.end, toAdd);
  }

  return new NoopChange();
}

function createConstructorForInjection(filePath: string, nodes: ts.Node[]): Change {
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

  const toAdd = `
  constructor(private http: HttpClient) {}
`;
  return new InsertChange(filePath, listNode.pos + 1, toAdd);
}

export function updateConstructor(options: DataServiceMethodSchema): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, options.dataServiceFilePath);
    const nodes = getSourceNodes(sourceFile);
    const ctorNode = nodes.find(n => n.kind === ts.SyntaxKind.Constructor);
    const constructorChange = !ctorNode
      ? createConstructorForInjection(options.dataServiceFilePath, nodes)
      : addConstructorArgument(options.dataServiceFilePath, ctorNode);

    insert(host, options.dataServiceFilePath, [
      constructorChange,
      insertImport(sourceFile, options.dataServiceFilePath, 'HttpClient', '@angular/common/http')
    ]);

    return host;
  };
}
