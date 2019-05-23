/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import {
  Change,
  InsertChange,
  NoopChange,
  RemoveChange,
  ReplaceChange
} from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { formatToCompare } from './string.utils';
import { readIntoSourceFile } from './ts.utils';

/**
 * Add Import `import { symbolName } from fileName` if the import doesn't exit
 * already. Assumes fileToEdit can be resolved and accessed.
 * @param source
 * @param fileToEdit (file we want to add import to)
 * @param symbolName (item to import)
 * @param fileName (path to the file)
 * @param isDefault (if true, import follows style for importing default exports)
 * @return Change
 */
export function insertImport(
  source: ts.SourceFile,
  fileToEdit: string,
  symbolName: string,
  fileName: string,
  isDefault = false
): Change {
  const rootNode = source;
  const allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);

  // get nodes that map to import statements from the file fileName
  const relevantImports = allImports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    const importFiles = node
      .getChildren()
      .filter(child => child.kind === ts.SyntaxKind.StringLiteral)
      .map(n => (n as ts.StringLiteral).text);

    return importFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantImports.length > 0) {
    let importsAsterisk = false;
    // imports from import file
    const imports: ts.Node[] = [];
    relevantImports.forEach(n => {
      Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        importsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (importsAsterisk) {
      return new NoopChange();
    }

    const importTextNodes = imports.filter(n => (n as ts.Identifier).text === symbolName);

    // insert import if it's not there
    if (importTextNodes.length === 0) {
      const fallbackPosition =
        findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].getStart() ||
        findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].getStart();

      return insertAfterLastOccurrence(imports, `, ${symbolName}`, fileToEdit, fallbackPosition);
    }

    return new NoopChange();
  }

  // no such import declaration exists
  const useStrict = findNodes(rootNode, ts.SyntaxKind.StringLiteral).filter(
    (n: ts.StringLiteral) => n.text === 'use strict'
  );
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }
  const open = isDefault ? '' : '{ ';
  const close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  const insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
  const separator = insertAtBeginning ? '' : ';\n';
  const toInsert =
    `${separator}import ${open}${symbolName}${close}` +
    ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;

  return insertAfterLastOccurrence(
    allImports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral
  );
}

/**
 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
 * @param node
 * @param kind
 * @param max The maximum number of items to return.
 * @return all nodes of kind, or [] if none is found
 */
export function findNodes<T extends ts.Node = ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind,
  max = Infinity
): T[] {
  if (!node || max === 0) {
    return [];
  }

  const arr: T[] = [];
  if (node.kind === kind) {
    arr.push(node as T);
    max--;
  }
  if (max > 0) {
    for (const child of node.getChildren()) {
      findNodes(child, kind, max).forEach(n => {
        if (max > 0) {
          arr.push(n as T);
        }
        max--;
      });

      if (max <= 0) {
        break;
      }
    }
  }

  return arr;
}

/**
 * Get all the nodes from a source.
 * @param sourceFile The source file object.
 */
export function getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
  const nodes: ts.Node[] = [sourceFile];
  const result: ts.Node[] = [];

  while (nodes.length > 0) {
    const node = nodes.shift();

    if (node) {
      result.push(node);
      if (node.getChildCount(sourceFile) >= 0) {
        nodes.unshift(...node.getChildren());
      }
    }
  }

  return result;
}

export function findNode<T extends ts.Node = ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind,
  text?: string
): T | null {
  if (node.kind === kind && (text ? node.getText() === text : true)) {
    return node as T;
  }

  let foundNode: ts.Node | null = null;
  const children = node.getChildren();
  for (let i = 0; i < children.length; i++) {
    foundNode = foundNode || findNode(children[i], kind, text);

    if (foundNode) {
      return foundNode as T;
    }
  }

  return null;
}

/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
function nodesByPosition(first: ts.Node, second: ts.Node): number {
  return first.getStart() - second.getStart();
}

/**
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 *
 * @param nodes insert after the last occurence of nodes
 * @param toInsert string to insert
 * @param file file to insert changes into
 * @param fallbackPos position to insert if toInsert happens to be the first occurence
 * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
 * @return Change instance
 * @throw Error if toInsert is first occurence but fall back is not set
 */
export function insertAfterLastOccurrence(
  nodes: ts.Node[],
  toInsert: string,
  file: string,
  fallbackPos: number,
  syntaxKind?: ts.SyntaxKind
): Change {
  // sort() has a side effect, so make a copy so that we won't overwrite the parent's object.
  let lastItem = [...nodes].sort(nodesByPosition).pop();
  if (lastItem && syntaxKind) {
    lastItem = findNodes(lastItem, syntaxKind)
      .sort(nodesByPosition)
      .pop();
  }
  if (!lastItem && fallbackPos === undefined) {
    throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
  }
  const lastItemPosition: number = lastItem ? lastItem.getEnd() : fallbackPos;

  return new InsertChange(file, lastItemPosition, toInsert);
}

export function getContentOfKeyLiteral(_source: ts.SourceFile, node: ts.Node): string | null {
  if (node.kind === ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text;
  } else if (node.kind === ts.SyntaxKind.StringLiteral) {
    return (node as ts.StringLiteral).text;
  } else {
    return null;
  }
}

function _angularImportsFromNode(
  node: ts.ImportDeclaration,
  _sourceFile: ts.SourceFile
): { [name: string]: string } {
  const ms = node.moduleSpecifier;

  let modulePath: string;
  if (ms.kind === ts.SyntaxKind.StringLiteral) {
    modulePath = (ms as ts.StringLiteral).text;
  } else {
    return {};
  }

  if (!modulePath.startsWith('@angular/')) {
    return {};
  }

  if (node.importClause) {
    if (node.importClause.name) {
      // This is of the form `import Name from 'path'`. Ignore.
      return {};
    } else if (node.importClause.namedBindings) {
      const nb = node.importClause.namedBindings;
      if (nb.kind === ts.SyntaxKind.NamespaceImport) {
        // This is of the form `import * as name from 'path'`. Return `name.`.
        return {
          [nb.name.text + '.']: modulePath
        };
      }

      return nb.elements
        .map((is: ts.ImportSpecifier) => (is.propertyName ? is.propertyName.text : is.name.text))
        .reduce((acc: { [name: string]: string }, curr: string) => {
          acc[curr] = modulePath;

          return acc;
        }, {});
    }

    return {};
  }

  // This is of the form `import 'path';`. Nothing to do.
  return {};
}

export function getDecoratorMetadata(
  source: ts.SourceFile,
  identifier: string,
  module: string
): ts.Node[] {
  const angularImports: { [name: string]: string } = findNodes(
    source,
    ts.SyntaxKind.ImportDeclaration
  )
    .map((node: ts.ImportDeclaration) => _angularImportsFromNode(node, source))
    .reduce((acc: { [name: string]: string }, current: { [name: string]: string }) => {
      for (const key of Object.keys(current)) {
        acc[key] = current[key];
      }

      return acc;
    }, {});

  return getSourceNodes(source)
    .filter(node => {
      return (
        node.kind === ts.SyntaxKind.Decorator &&
        (node as ts.Decorator).expression.kind === ts.SyntaxKind.CallExpression
      );
    })
    .map(node => (node as ts.Decorator).expression as ts.CallExpression)
    .filter(expr => {
      if (expr.expression.kind === ts.SyntaxKind.Identifier) {
        const id = expr.expression as ts.Identifier;

        return (
          id.getFullText(source) === identifier && angularImports[id.getFullText(source)] === module
        );
      } else if (expr.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
        // This covers foo.NgModule when importing * as foo.
        const paExpr = expr.expression as ts.PropertyAccessExpression;
        // If the left expression is not an identifier, just give up at that point.
        if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
          return false;
        }

        const id = paExpr.name.text;
        const moduleId = (paExpr.expression as ts.Identifier).getText(source);

        return id === identifier && angularImports[moduleId + '.'] === module;
      }

      return false;
    })
    .filter(
      expr => expr.arguments[0] && expr.arguments[0].kind === ts.SyntaxKind.ObjectLiteralExpression
    )
    .map(expr => expr.arguments[0] as ts.ObjectLiteralExpression);
}

function findClassDeclarationParent(node: ts.Node): ts.ClassDeclaration | undefined {
  if (ts.isClassDeclaration(node)) {
    return node;
  }

  return node.parent && findClassDeclarationParent(node.parent);
}

/**
 * Given a source file with @NgModule class(es), find the name of the first @NgModule class.
 *
 * @param source source file containing one or more @NgModule
 * @returns the name of the first @NgModule, or `undefined` if none is found
 */
export function getFirstNgModuleName(source: ts.SourceFile): string | undefined {
  // First, find the @NgModule decorators.
  const ngModulesMetadata = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  if (ngModulesMetadata.length === 0) {
    return undefined;
  }

  // Then walk parent pointers up the AST, looking for the ClassDeclaration parent of the NgModule
  // metadata.
  const moduleClass = findClassDeclarationParent(ngModulesMetadata[0]);
  if (!moduleClass || !moduleClass.name) {
    return undefined;
  }

  // Get the class name of the module ClassDeclaration.
  return moduleClass.name.text;
}

// This should be moved to @schematics/angular once it allows to pass custom expressions as providers
export function _addSymbolToNgModuleMetadata(
  source: ts.SourceFile,
  ngModulePath: string,
  metadataField: string,
  expression: string
): Change[] {
  const nodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  let node: any = nodes[0]; // tslint:disable-line:no-any

  // Find the decorator declaration.
  if (!node) {
    return [];
  }
  // Get all the children property assignment of object literals.
  const matchingProperties: ts.ObjectLiteralElement[] = (node as ts.ObjectLiteralExpression).properties
    .filter(prop => prop.kind === ts.SyntaxKind.PropertyAssignment)
    // Filter out every fields that's not "metadataField". Also handles string literals
    // (but not expressions).
    .filter((prop: ts.PropertyAssignment) => {
      const name = prop.name;
      switch (name.kind) {
        case ts.SyntaxKind.Identifier:
          return name.getText(source) === metadataField;
        case ts.SyntaxKind.StringLiteral:
          return name.text === metadataField;
      }

      return false;
    });

  // Get the last node of the array literal.
  if (!matchingProperties) {
    return [];
  }
  if (matchingProperties.length === 0) {
    // We haven't found the field in the metadata declaration. Insert a new field.
    const expr = node as ts.ObjectLiteralExpression;
    let pos: number;
    let toIns: string;
    if (expr.properties.length === 0) {
      pos = expr.getEnd() - 1;
      toIns = `  ${metadataField}: [${expression}]\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      pos = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      toIns = text.match('^\r?\r?\n')
        ? `,${text.match(/^\r?\n\s+/)[0]}${metadataField}: [${expression}]`
        : `, ${metadataField}: [${expression}]`;
    }
    const newMetadataProperty = new InsertChange(ngModulePath, pos, toIns);
    return [newMetadataProperty];
  }

  const assignment = matchingProperties[0] as ts.PropertyAssignment;

  // If it's not an array, nothing we can do really.
  if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return [];
  }

  const arrLiteral = assignment.initializer as ts.ArrayLiteralExpression;
  node = arrLiteral.elements.length === 0 ? arrLiteral : arrLiteral.elements;

  if (!node) {
    console.log('No app module found. Please add your new class to your component.');

    return [];
  }

  if (Array.isArray(node)) {
    const nodeArray = (node as {}) as ts.Node[];
    const symbolsArray = nodeArray.map(n => n.getText());
    if (symbolsArray.includes(expression)) {
      return [];
    }

    node = node[node.length - 1];
  }

  let toInsert: string;
  let position = node.getEnd();
  if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    // We haven't found the field in the metadata declaration. Insert a new
    // field.
    const expr = node as ts.ObjectLiteralExpression;
    if (expr.properties.length === 0) {
      position = expr.getEnd() - 1;
      toInsert = `  ${metadataField}: [${expression}]\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      position = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      toInsert = text.match('^\r?\r?\n')
        ? `,${text.match(/^\r?\n\s+/)[0]}${metadataField}: [${expression}]`
        : `, ${metadataField}: [${expression}]`;
    }
  } else if (node.kind === ts.SyntaxKind.ArrayLiteralExpression) {
    // We found the field but it's empty. Insert it just before the `]`.
    position--;
    toInsert = `${expression}`;
  } else {
    // Get the indentation of the last element, if any.
    const text = node.getFullText(source);
    toInsert = text.match(/^\r?\n/)
      ? `,${text.match(/^\r?\n(\r?)\s+/)[0]}${expression}`
      : `, ${expression}`;
  }
  const ins = new InsertChange(ngModulePath, position, toInsert);
  return [ins];
}

/**
 * Custom function to insert a declaration (component, pipe, directive)
 * into NgModule declarations. It also imports the component.
 */
export function addDeclarationToModule(
  source: ts.SourceFile,
  modulePath: string,
  symbolName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'declarations', symbolName);
}

/**
 * Custom function to insert an NgModule into NgModule imports. It also imports the module.
 */
export function addImportToModule(
  source: ts.SourceFile,
  modulePath: string,
  symbolName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'imports', symbolName);
}

/**
 * Custom function to insert a provider into NgModule. It also imports it.
 */
export function addProviderToModule(
  source: ts.SourceFile,
  modulePath: string,
  symbolName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'providers', symbolName);
}

/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
export function addExportToModule(
  source: ts.SourceFile,
  modulePath: string,
  classifiedName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'exports', classifiedName);
}

/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
export function addBootstrapToModule(
  source: ts.SourceFile,
  modulePath: string,
  classifiedName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'bootstrap', classifiedName);
}

/**
 * Custom function to insert an entryComponent into NgModule. It also imports it.
 */
// tslint:disable-next-line:no-identical-functions
export function addEntryComponentToModule(
  source: ts.SourceFile,
  modulePath: string,
  classifiedName: string
): Change[] {
  return _addSymbolToNgModuleMetadata(source, modulePath, 'entryComponents', classifiedName);
}

/**
 * Determine if an import already exists.
 */
export function isImported(
  source: ts.SourceFile,
  classifiedName: string,
  importPath: string
): boolean {
  const allNodes = getSourceNodes(source);
  const matchingNodes = allNodes
    .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
    .filter((imp: ts.ImportDeclaration) => imp.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral)
    .filter((imp: ts.ImportDeclaration) => {
      return (imp.moduleSpecifier as ts.StringLiteral).text === importPath;
    })
    .filter((imp: ts.ImportDeclaration) => {
      if (!imp.importClause) {
        return false;
      }
      const nodes = findNodes(imp.importClause, ts.SyntaxKind.ImportSpecifier).filter(
        n => n.getText() === classifiedName
      );

      return nodes.length > 0;
    });

  return matchingNodes.length > 0;
}

export function addGlobal(source: ts.SourceFile, modulePath: string, statement: string): Change[] {
  const allImports = findNodes(source, ts.SyntaxKind.ImportDeclaration);
  if (allImports.length > 0) {
    const lastImport = allImports[allImports.length - 1];
    return [new InsertChange(modulePath, lastImport.end + 1, `\n${statement}\n`)];
  } else {
    return [new InsertChange(modulePath, 0, `${statement}\n`)];
  }
}

export function insert(host: Tree, modulePath: string, changes: Change[]): void {
  if (changes.length < 1) {
    return;
  }
  const recorder = host.beginUpdate(modulePath);
  for (const change of changes) {
    if (change instanceof InsertChange) {
      recorder.insertLeft(change.pos, change.toAdd);
    } else if (change instanceof RemoveChange) {
      recorder.remove((change as any).pos - 1, (change as any).toRemove.length + 1);
    } else if (change instanceof NoopChange) {
      // do nothing
    } else if (change instanceof ReplaceChange) {
      const action = change as any;
      recorder.remove(action.pos, action.oldText.length);
      recorder.insertLeft(action.pos, action.newText);
    } else {
      throw new Error(`Unexpected Change '${change}'`);
    }
  }
  host.commitUpdate(recorder);
}

export function findDescribeBlockNode(node: ts.Node): ts.Block | null {
  const describeIdentifierNode = findNode(node, ts.SyntaxKind.Identifier, 'describe');

  if (!describeIdentifierNode) {
    return null;
  }

  return findNode(describeIdentifierNode.parent, ts.SyntaxKind.Block);
}

export function findSpecDefinition(node: ts.Node): ts.Node | null {
  const describeIdentifierNode = findNode(node, ts.SyntaxKind.Identifier, 'describe');

  if (!describeIdentifierNode) {
    return null;
  }

  const parent = describeIdentifierNode.parent as ts.CallExpression;
  return parent.arguments[1] || null;
}

export function findNodesInBlock<T extends ts.Node = ts.Node>(
  node: ts.Node,
  kind: ts.SyntaxKind
): T[] {
  const arr: ts.Node[] = [];

  if (node.kind === kind) {
    arr.push(node);
  }

  for (const child of node.getChildren()) {
    if (child.kind === ts.SyntaxKind.Block) {
      break;
    }

    findNodesInBlock(child, kind).forEach(n => {
      arr.push(n);
    });
  }

  return arr as T[];
}

export function addSymbolToObject(
  source: ts.SourceFile,
  objectLiteralExpression: ts.ObjectLiteralExpression,
  filePath: string,
  field: string,
  expression: string
): Change[] {
  let node: any = objectLiteralExpression;

  // Find the decorator declaration.
  if (!node) {
    return [];
  }
  // Get all the children property assignment of object literals.
  const matchingProperties: ts.ObjectLiteralElement[] = (node as ts.ObjectLiteralExpression).properties
    .filter(prop => prop.kind === ts.SyntaxKind.PropertyAssignment)
    // Filter out every fields that's not "metadataField". Also handles string literals
    // (but not expressions).
    .filter((prop: ts.PropertyAssignment) => {
      const name = prop.name;
      switch (name.kind) {
        case ts.SyntaxKind.Identifier:
          return name.getText(source) === field;
        case ts.SyntaxKind.StringLiteral:
          return name.text === field;
      }

      return false;
    });

  // Get the last node of the array literal.
  if (!matchingProperties) {
    return [];
  }
  if (matchingProperties.length === 0) {
    // We haven't found the field in the metadata declaration. Insert a new field.
    const expr = node as ts.ObjectLiteralExpression;
    let pos: number;
    let toIns: string;
    if (expr.properties.length === 0) {
      pos = expr.getEnd() - 1;
      toIns = `  ${field}: [${expression}]\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      pos = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      toIns = text.match('^\r?\r?\n')
        ? `,${text.match(/^\r?\n\s+/)[0]}${field}: [${expression}]`
        : `, ${field}: [${expression}]`;
    }
    const newMetadataProperty = new InsertChange(filePath, pos, toIns);
    return [newMetadataProperty];
  }

  const assignment = matchingProperties[0] as ts.PropertyAssignment;

  // If it's not an array, nothing we can do really.
  if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return [];
  }

  const arrLiteral = assignment.initializer as ts.ArrayLiteralExpression;
  node = arrLiteral.elements.length === 0 ? arrLiteral : arrLiteral.elements;

  if (!node) {
    console.log('No app module found. Please add your new class to your component.');

    return [];
  }

  if (Array.isArray(node)) {
    const nodeArray = (node as {}) as ts.Node[];
    const symbolsArray = nodeArray.map(n => formatToCompare(n.getText()));
    if (symbolsArray.includes(formatToCompare(expression))) {
      return [];
    }

    node = node[node.length - 1];
  }

  let toInsert: string;
  let position = node.getEnd();
  if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    // We haven't found the field in the metadata declaration. Insert a new
    // field.
    const expr = node as ts.ObjectLiteralExpression;
    if (expr.properties.length === 0) {
      position = expr.getEnd() - 1;
      toInsert = `  ${field}: [${expression}]\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      position = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      toInsert = text.match('^\r?\r?\n')
        ? `,${text.match(/^\r?\n\s+/)[0]}${field}: [${expression}]`
        : `, ${field}: [${expression}]`;
    }
  } else if (node.kind === ts.SyntaxKind.ArrayLiteralExpression) {
    // We found the field but it's empty. Insert it just before the `]`.
    position--;
    toInsert = `${expression}`;
  } else {
    // Get the indentation of the last element, if any.
    const text = node.getFullText(source);
    toInsert = text.match(/^\r?\n/)
      ? `,${text.match(/^\r?\n(\r?)\s+/)[0]}${expression}`
      : `, ${expression}`;
  }
  const ins = new InsertChange(filePath, position, toInsert);
  return [ins];
}

export function addExportAstrix(host: Tree, filePath: string, exportFilePath: string): Change {
  const sourceFile = readIntoSourceFile(host, filePath);

  const exportDeclarations = findNodes<ts.ExportDeclaration>(
    sourceFile,
    ts.SyntaxKind.ExportDeclaration
  );
  if (exportDeclarations.find(ed => ed.getText().includes(exportFilePath))) {
    return new NoopChange();
  }

  return new InsertChange(filePath, sourceFile.getStart(), `export * from '${exportFilePath}';\n`);
}
