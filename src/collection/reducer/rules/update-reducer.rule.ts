import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { findNode, insert } from '../../../utils/ast.utils';
import {
  CommonReducerProperties,
  ParsedReducerWithCreator,
  ParsedReducerWithSwitch
} from '../../../utils/file-parsing.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { camelize } from '../../../utils/string.utils';
import { parseInterfaceMembers, parseType } from '../../../utils/ts.utils';
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

  if (type.includes('[]')) {
    return '[]';
  }

  return 'null';
}

function createImportsForTypes(
  fileToEdit: string,
  host: Tree,
  stateProperties: StateProperty[]
): void {
  stateProperties.forEach(sp => {
    const types = parseType(sp.type);
    types.forEach(type => {
      insertTypeImport(host, fileToEdit, type);
    });
  });
}

function createStateProperties(
  filePath: string,
  reducerFile: CommonReducerProperties,
  interfaceProps: Array<[ts.Identifier, ts.Node]>,
  stateProperties: StateProperty[]
): InsertChange[] {
  const changes: InsertChange[] = [];
  const initializer = reducerFile.initialState.initializer as ts.ObjectLiteralExpression;
  const addTrailingComma =
    initializer.properties.hasTrailingComma || !initializer.properties.length;
  const callExpression = findNode(reducerFile.initialState, ts.SyntaxKind.CallExpression);
  const objectLiteral = callExpression
    ? findNode(callExpression, ts.SyntaxKind.ObjectLiteralExpression)
    : null;
  const initialStatePos = objectLiteral
    ? objectLiteral.getEnd() - 1
    : reducerFile.initialState.getEnd() - 1;

  if (!addTrailingComma) {
    changes.push(new InsertChange(filePath, initialStatePos - 1, `,`));
  }

  stateProperties.forEach(stateProperty => {
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
          `${stateProperty.key}: ${guessInitialValue(stateProperty.type)},\n`
        )
      );
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
    `\ncase ${actionsNamespace}.${config.action.typesEnumName}.${actionName}: {\n` +
      `state = {\n` +
      `...state,\n` +
      `${props}\n` +
      `};\n` +
      `break;\n}\n`
  );
}

function createOnStatement(
  reducerCreatorStatement: ts.CallExpression,
  path: string,
  actionsAliasName: string,
  actionName: string,
  stateProperties: StateProperty[],
  stateInterfaceName: string
): InsertChange {
  let props = '';

  stateProperties.forEach(prop => {
    props += `${prop.key}: ${prop.value},`;
  });

  return new InsertChange(
    path,
    reducerCreatorStatement.end - 1,
    `,\non(${actionsAliasName}.${camelize(
      actionName
    )}, (state, action): ${stateInterfaceName} => ({\n` +
      `...state,\n` +
      `${props}\n` +
      `}))\n`
  );
}

export function updateReducer(
  reducerSourceFile: ts.SourceFile,
  parsedReducerFile: ParsedReducerWithCreator | ParsedReducerWithSwitch,
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
      ...(options.creators
        ? [
            createOnStatement(
              (parsedReducerFile as ParsedReducerWithCreator).reducerCreatorStatement,
              stateDir.reducer,
              actionsNamespace,
              options.actionName,
              statePropertiesToUpdate,
              parsedReducerFile.stateInterface.name.escapedText as string
            )
          ]
        : [
            createCaseStatement(
              (parsedReducerFile as ParsedReducerWithSwitch).reducerSwitchStatement,
              stateDir.reducer,
              actionsNamespace,
              options.actionName,
              statePropertiesToUpdate
            )
          ])
    ];
    insert(host, stateDir.reducer, changes);

    createImportsForTypes(stateDir.reducer, host, statePropertiesToUpdate);

    return host;
  };
}
