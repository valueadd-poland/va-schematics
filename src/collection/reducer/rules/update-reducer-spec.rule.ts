import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { findNode, insert } from '../../../utils/ast.utils';
import { ParsedReducerFile } from '../../../utils/file-parsing.utils';
import { insertCustomImport } from '../../../utils/import.utils';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { ReducerSchema } from '../reducer-schema.interface';

function createTest(
  actionName: string,
  actionsNamespace: string,
  parsedReducerFile: ParsedReducerFile,
  stateProperties: StateProperty[]
): string {
  const statePropertiesList = stateProperties.map(stateProperty => stateProperty.key).join(', ');
  const statePropertiesStringList = stateProperties.map(stateProperty => `'${stateProperty.key}'`);
  const hasPayload = stateProperties.some(stateProperty => stateProperty.value.includes('payload'));
  let expects = stateProperties
    .map(
      stateProperty =>
        `expect(result.${stateProperty.key}).toBe(${
          stateProperty.value.includes('payload') ? 'payload' : stateProperty.value
        });`
    )
    .join('\n');
  expects += `\nexpect(statesEqual(result, state, [${statePropertiesStringList}])).toBeTruthy()`;

  // @Todo: check if action should have payload.
  return `
    describe('${actionName}', () => {
      it('should set ${statePropertiesList} and do not modify other state properties', () => {
         const payload = {} as any;
         const action = new ${actionsNamespace}.${actionName}(payload);
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

    const toAdd = createTest(
      options.actionName,
      actionsNamespace,
      parsedReducerFile,
      stateProperties
    );
    const change = new InsertChange(stateDir.reducerSpec, describeBlock.getEnd() - 1, toAdd);
    insert(host, stateDir.reducerSpec, [change]);
    insertCustomImport(host, stateDir.reducerSpec, 'statesEqual', '@valueadd/common');

    return host;
  };
}
