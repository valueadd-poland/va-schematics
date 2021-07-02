import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { findNode, findNodes, insert } from '../../../utils/ast.utils';
import {
  ParsedReducerWithCreator,
  ParsedReducerWithSwitch
} from '../../../utils/file-parsing.utils';
import { insertCustomImport } from '../../../utils/import.utils';
import { toPropertyName } from '../../../utils/name.utils';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { camelize } from '../../../utils/string.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { ReducerSchema } from '../reducer-schema.interface';

function createTest(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator,
  stateProperties: StateProperty[],
  hasPayload: boolean,
  creators: boolean
): string {
  const statePropertiesList = stateProperties.map(stateProperty => stateProperty.key).join(', ');
  const statePropertiesStringList = stateProperties.map(stateProperty => `'${stateProperty.key}'`);
  let expects = stateProperties
    .map(
      stateProperty =>
        `expect(result.${stateProperty.key}).toEqual(${
          stateProperty.value.includes('payload') ? 'payload' : stateProperty.value
        });`
    )
    .join('\n');
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;
  const action = createAction(actionsNamespace, actionName, hasPayload, creators);
  const reducer = createReducer(creators, parsedReducerFile);

  return `
    describe('${actionName}', () => {
      test('sets ${statePropertiesList} and does not modify other state properties', () => {
         ${hasPayload ? 'const payload = {} as any;' : ''}
         const action = ${action}
         const result = ${reducer};

         ${expects}
      });
    });
    `;
}

function createTestCreateSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator,
  stateProperties: StateProperty[],
  hasPayload: boolean,
  creators: boolean
): string {
  const statePropertiesList = stateProperties.map(stateProperty => stateProperty.key).join(', ');
  const statePropertiesStringList = stateProperties.map(stateProperty => `'${stateProperty.key}'`);
  let expects = stateProperties
    .map(
      stateProperty =>
        `expect(result.${stateProperty.key}${
          stateProperty.value.includes('payload') ? '.length' : ''
        }).toEqual(${stateProperty.value.includes('payload') ? '1' : stateProperty.value});`
    )
    .join('\n');
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;
  const action = createAction(actionsNamespace, actionName, hasPayload, creators);
  const reducer = createReducer(creators, parsedReducerFile);
  return `
    describe('${actionName}', () => {
      test('sets ${statePropertiesList} and does not modify other state properties', () => {
         ${hasPayload ? 'const payload = {} as any;' : ''}
         const action = ${action}
         const result = ${reducer};

         ${expects}
      });
    });
    `;
}

function createTestUpdateSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator,
  stateProperties: StateProperty[],
  hasPayload: boolean,
  creators: boolean
): string {
  const statePropertiesList = stateProperties.map(stateProperty => stateProperty.key).join(', ');
  const statePropertiesStringList = stateProperties.map(stateProperty => `'${stateProperty.key}'`);
  let expects = stateProperties
    .map(
      stateProperty =>
        `expect((result as any).${stateProperty.key}${
          stateProperty.value.includes('payload') ? '[0].name' : ''
        }).toEqual(${stateProperty.value.includes('payload') ? "'test2'" : stateProperty.value});`
    )
    .join('\n');
  const action = createAction(actionsNamespace, actionName, hasPayload, creators);
  const reducer = createReducer(creators, parsedReducerFile);
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;
  const prop = toPropertyName(actionName.slice(6, -7) + 'Collection');
  return `
    describe('${actionName}', () => {
      test('sets ${statePropertiesList} and does not modify other state properties', () => {
         state = { ...initialState, ${prop}: [{ id: '1', name: 'test' } as any] };
         ${hasPayload ? "const payload = {id: '1', name: 'test2'} as any;" : ''}
         const action = ${action}
         const result = ${reducer};

         ${expects}
      });
    });
    `;
}

function createTestRemoveSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator,
  stateProperties: StateProperty[],
  hasPayload: boolean,
  creators: boolean
): string {
  const statePropertiesList = stateProperties.map(stateProperty => stateProperty.key).join(', ');
  const statePropertiesStringList = stateProperties.map(stateProperty => `'${stateProperty.key}'`);
  let expects = stateProperties
    .map(
      stateProperty =>
        `expect(result.${stateProperty.key}${
          stateProperty.value.includes('payload') ? '.length' : ''
        }).toEqual(${stateProperty.value.includes('payload') ? '0' : stateProperty.value});`
    )
    .join('\n');
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;
  const action = createAction(actionsNamespace, actionName, hasPayload, creators);
  const reducer = createReducer(creators, parsedReducerFile);
  const prop = toPropertyName(actionName.slice(6, -7) + 'Collection');
  return `
    describe('${actionName}', () => {
      test('sets ${statePropertiesList} and does not modify other state properties', () => {
         state = { ...initialState, ${prop}: [{ id: '1', name: 'test' } as any] };
         ${hasPayload ? "const payload = {id: '1', name: 'test2'} as any;" : ''}
         const action = ${action}
         const result = ${reducer};

         ${expects}
      });
    });
    `;
}

export function updateReducerSpec(
  reducerSpecSourceFile: ts.SourceFile,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator,
  actionsNamespace: string,
  stateDir: StateFilePaths,
  options: ReducerSchema
): Rule {
  return (host: Tree) => {
    const creators = options.creators as boolean;
    const stateProperties = parsePropsToUpdate(options.propsToUpdate);

    const describeIdentifierNode = findNode(
      reducerSpecSourceFile,
      ts.SyntaxKind.Identifier,
      'describe'
    );

    if (!describeIdentifierNode) {
      throw new Error(`describe function not found in ${stateDir.reducerSpec}.`);
    }

    const describeBlock = findNode(describeIdentifierNode.parent, ts.SyntaxKind.Block);

    if (!describeBlock) {
      throw new Error(`describe function's block not found in ${stateDir.reducerSpec}.`);
    }

    const hasPayload = getHasPayload(creators, host, stateDir, options);

    let toAdd: string;

    if (options.actionName.includes('Create') && options.actionName.includes('Success')) {
      toAdd = createTestCreateSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasPayload,
        creators
      );
    } else if (options.actionName.includes('Update') && options.actionName.includes('Success')) {
      toAdd = createTestUpdateSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasPayload,
        creators
      );
    } else if (options.actionName.includes('Remove') && options.actionName.includes('Success')) {
      toAdd = createTestRemoveSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasPayload,
        creators
      );
    } else {
      toAdd = createTest(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasPayload,
        creators
      );
    }

    const change = new InsertChange(stateDir.reducerSpec, describeBlock.getEnd() - 1, toAdd);
    insert(host, stateDir.reducerSpec, [change]);
    insertCustomImport(host, stateDir.reducerSpec, 'statesEqual', '@valueadd/testing');

    return host;
  };
}

function createAction(
  actionsNamespace: string,
  actionName: string,
  hasPayload: boolean,
  creators: boolean
): string {
  return creators
    ? `${actionsNamespace}.${camelize(actionName)}(${hasPayload ? '{payload}' : ''});`
    : `new ${actionsNamespace}.${actionName}(${hasPayload ? 'payload' : ''});`;
}

function createReducer(
  creators: boolean,
  parsedReducerFile: ParsedReducerWithSwitch | ParsedReducerWithCreator
): string {
  return creators
    ? `${
        (parsedReducerFile as ParsedReducerWithCreator as any).reducerDeclaration.name.escapedText
      }(state, action);`
    : `${(
        parsedReducerFile as ParsedReducerWithSwitch
      ).reducerFunction.name!.getText()}(state, action);`;
}

function getActions(
  creators: boolean,
  host: Tree,
  actionsDir: string
): ts.VariableDeclaration[] | ts.ClassDeclaration[] {
  return creators
    ? findNodes<ts.VariableDeclaration>(
        readIntoSourceFile(host, actionsDir),
        ts.SyntaxKind.VariableDeclaration
      )
    : findNodes<ts.ClassDeclaration>(
        readIntoSourceFile(host, actionsDir),
        ts.SyntaxKind.ClassDeclaration
      );
}

function getHasPayload(
  creators: boolean,
  host: Tree,
  stateDir: StateFilePaths,
  options: ReducerSchema
): boolean {
  const actions = getActions(creators, host, stateDir.actions);
  const action = (actions as any[]).find(cd => {
    return !!cd.name && cd.name.getText().toLowerCase() === options.actionName.toLocaleLowerCase();
  });
  if (action) {
    if (creators) {
      const props = findNode<ts.CallExpression>(action, ts.SyntaxKind.CallExpression, 'props');
      return !!props;
    } else {
      const constructor = findNode<ts.ConstructorDeclaration>(action, ts.SyntaxKind.Constructor);
      return !!constructor && !!constructor.parameters.length;
    }
  }

  return false;
}
