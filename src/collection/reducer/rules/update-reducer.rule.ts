import { Rule, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import * as ts from 'typescript';
import { findNode, insert, insertImport, isImported } from '../../../utils/ast.utils';
import { ParsedReducerFile } from '../../../utils/file-parsing.utils';
import { findNodesByTypeAndNameInTree } from '../../../utils/find-type-declaration-file.util';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { isBaseType, parseInterfaceMembers } from '../../../utils/ts.utils';
import { config } from '../../config';
import { ReducerSchema } from '../reducer-schema.interface';

function guessInitialValue(type: string): string {
  if (type === 'boolean') {
    return 'false';
  }

  if (type === 'number') {
    return '0';
  }

  if (type === 'null' || type === 'undefined') {
    return type;
  }

  return 'null';
}

function findTypeFile(tree: Tree, type: string): string | null {
  if (isBaseType(type)) {
    return null;
  }

  return findNodesByTypeAndNameInTree(tree, ['class', 'interface', 'enum', 'type'], type)[0];
}

function createImport(
  sourceFile: ts.SourceFile,
  tree: Tree,
  fileToEdit: string,
  type: string
): Change | null {
  if (isBaseType(type)) {
    return null;
  }

  const typeFile = findTypeFile(tree, type);

  if (typeFile) {
    const path = buildRelativePath(fileToEdit, typeFile);
    if (!isImported(sourceFile, type, path)) {
      return insertImport(sourceFile, fileToEdit, type, path);
    }
  }

  return null;
}

function createImports(
  sourceFile: ts.SourceFile,
  fileToEdit: string,
  tree: Tree,
  stateProperties: StateProperty[]
): any {
  const changes: Change[] = [];

  stateProperties.forEach(stateProperty => {
    const type = stateProperty.type;

    if (isBaseType(type)) {
      return;
    }

    if (type.includes('|')) {
      type.split('|').forEach(t => {
        const change = createImport(sourceFile, tree, fileToEdit, t);

        if (change) {
          changes.push(change);
        }
      });
    } else {
      const change = createImport(sourceFile, tree, fileToEdit, type);

      if (change) {
        changes.push(change);
      }
    }
  });

  return changes;
}

function createStateProperties(
  filePath: string,
  reducerFile: ParsedReducerFile,
  interfaceProps: Array<[ts.Identifier, ts.Node]>,
  stateProperties: StateProperty[]
): InsertChange[] {
  const changes: InsertChange[] = [];
  let leadingComma = !!(reducerFile.initialState.initializer as ts.ObjectLiteralExpression)
    .properties.length;

  stateProperties.forEach(stateProperty => {
    const callExpression = findNode(reducerFile.initialState, ts.SyntaxKind.CallExpression);
    const objectLiteral = callExpression
      ? findNode(callExpression, ts.SyntaxKind.ObjectLiteralExpression)
      : null;
    const initialStatePos = objectLiteral
      ? objectLiteral.getEnd() - 1
      : reducerFile.initialState.getEnd() - 1;

    // if there is no property in interface, add it to interface and initial state
    if (!interfaceProps.find(prop => prop[0].getText() === stateProperty.key)) {
      changes.push(
        new InsertChange(
          filePath,
          reducerFile.stateInterface.getEnd() - 1,
          `${stateProperty.key}: ${stateProperty.type};\n`
        )
      );

      changes.push(
        new InsertChange(
          filePath,
          initialStatePos,
          `${leadingComma ? ',' : ''}${stateProperty.key}: ${guessInitialValue(
            stateProperty.type
          )}\n`
        )
      );
      leadingComma = true;
    }
  });

  return changes;
}

function createCaseStatement(
  switchStatement: ts.SwitchStatement,
  path: string,
  actionsNamespace: string,
  actionName: string,
  stateProperties: StateProperty[]
): InsertChange {
  let props = '';

  stateProperties.forEach(prop => {
    props += `${prop.key}: ${prop.value},`;
  });

  return new InsertChange(
    path,
    switchStatement.getEnd() - 1,
    `\ncase ${actionsNamespace}.${config.action.collectiveTypeName}.${actionName}: {\n` +
      `state = {\n` +
      `...state,\n` +
      `${props}\n` +
      `};\n` +
      `break;\n}\n`
  );
}

export function updateReducer(
  reducerSourceFile: ts.SourceFile,
  parsedReducerFile: ParsedReducerFile,
  actionsNamespace: string,
  stateDir: StateFilePaths,
  options: ReducerSchema
): Rule {
  return (host: Tree) => {
    const currentInterfaceProperties = parseInterfaceMembers(
      parsedReducerFile.stateInterface.members
    );
    const statePropertiesToUpdate = parsePropsToUpdate(options.propsToUpdate);
    const changes = [
      ...createStateProperties(
        stateDir.reducer,
        parsedReducerFile,
        currentInterfaceProperties,
        statePropertiesToUpdate
      ),
      createCaseStatement(
        parsedReducerFile.reducerSwitchStatement,
        stateDir.reducer,
        actionsNamespace,
        options.actionName,
        statePropertiesToUpdate
      ),
      ...createImports(reducerSourceFile, stateDir.reducer, host, statePropertiesToUpdate)
    ];
    insert(host, stateDir.reducer, changes);

    return host;
  };
}
