import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { findNode, findNodes, insert } from '../../../utils/ast.utils';
import { ParsedReducerFile } from '../../../utils/file-parsing.utils';
import { insertCustomImport } from '../../../utils/import.utils';
import { toPropertyName } from '../../../utils/name.utils';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { ReducerSchema } from '../reducer-schema.interface';

function createTest(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerFile,
  stateProperties: StateProperty[],
  hasPayload: boolean
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

  return `
    describe('${actionName}', () => {
      it('should set ${statePropertiesList} and do not modify other state properties', () => {
         ${hasPayload ? 'const payload = {} as any;' : ''}
         const action = new ${actionsNamespace}.${actionName}(${hasPayload ? 'payload' : ''});
         const result = ${parsedReducerFile.reducerFunction.name!.getText()}(state, action);
         
         ${expects}
      });
    });
    `;
}

function createTestCreateSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerFile,
  stateProperties: StateProperty[],
  hasPayload: boolean
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

  return `
    describe('${actionName}', () => {
      it('should set ${statePropertiesList} and do not modify other state properties', () => {
         ${hasPayload ? 'const payload = {} as any;' : ''}
         const action = new ${actionsNamespace}.${actionName}(${hasPayload ? 'payload' : ''});
         const result = ${parsedReducerFile.reducerFunction.name!.getText()}(state, action);
         
         ${expects}
      });
    });
    `;
}

function createTestUpdateSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerFile,
  stateProperties: StateProperty[],
  hasPayload: boolean
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
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;
  const prop = toPropertyName(actionName.slice(6, -7) + 's');
  return `
    describe('${actionName}', () => {
      it('should set ${statePropertiesList} and do not modify other state properties', () => {
         state = { ...initialState, ${prop}: [{ id: '1', name: 'test' } as any] };
         ${hasPayload ? "const payload = {id: '1', name: 'test2'} as any;" : ''}
         const action = new ${actionsNamespace}.${actionName}(${hasPayload ? 'payload' : ''});
         const result = ${parsedReducerFile.reducerFunction.name!.getText()}(state, action);
         
         ${expects}
      });
    });
    `;
}

function createTestRemoveSuccess(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerFile,
  stateProperties: StateProperty[],
  hasPayload: boolean
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
  const prop = toPropertyName(actionName.slice(6, -7) + 's');
  return `
    describe('${actionName}', () => {
      it('should set ${statePropertiesList} and do not modify other state properties', () => {
         state = { ...initialState, ${prop}: [{ id: '1', name: 'test' } as any] };
         ${hasPayload ? "const payload = {id: '1', name: 'test2'} as any;" : ''}
         const action = new ${actionsNamespace}.${actionName}(${hasPayload ? 'payload' : ''});
         const result = ${parsedReducerFile.reducerFunction.name!.getText()}(state, action);
         
         ${expects}
      });
    });
    `;
}

export function updateReducerSpec(
  reducerSpecSourceFile: ts.SourceFile,
  parsedReducerFile: ParsedReducerFile,
  actionsNamespace: string,
  stateDir: StateFilePaths,
  options: ReducerSchema
): Rule {
  return (host: Tree) => {
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

    let hasAction = false;
    const actions = findNodes<ts.ClassDeclaration>(
      readIntoSourceFile(host, stateDir.actions),
      ts.SyntaxKind.ClassDeclaration
    );
    const action = actions.find(cd => !!cd.name && cd.name.getText() === options.actionName);
    if (action) {
      const constructor = findNode<ts.ConstructorDeclaration>(action, ts.SyntaxKind.Constructor);
      if (constructor) {
        hasAction = !!constructor.parameters.length;
      }
    }

    let toAdd: string;

    if (options.actionName.includes('Create') && options.actionName.includes('Success')) {
      toAdd = createTestCreateSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasAction
      );
    } else if (options.actionName.includes('Update') && options.actionName.includes('Success')) {
      toAdd = createTestUpdateSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasAction
      );
    } else if (options.actionName.includes('Remove') && options.actionName.includes('Success')) {
      toAdd = createTestRemoveSuccess(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasAction
      );
    } else {
      toAdd = createTest(
        options.actionName,
        actionsNamespace,
        parsedReducerFile,
        stateProperties,
        hasAction
      );
    }

    const change = new InsertChange(stateDir.reducerSpec, describeBlock.getEnd() - 1, toAdd);
    insert(host, stateDir.reducerSpec, [change]);
    insertCustomImport(host, stateDir.reducerSpec, 'statesEqual', '@valueadd/common');

    return host;
  };
}
