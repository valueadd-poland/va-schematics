import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { StateFilePaths } from '../../../utils/options-parsing.utils';
import { findDeclarationNodeByName, readIntoSourceFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { ActionSchema } from '../action-schema.interface';

function getActionPayload(payload: string | undefined): string {
  return payload ? `constructor(public payload: ${payload}) {}` : '';
}

function getActionClass(name: string, payload: string | undefined): string {
  return `\n\nexport class ${name} implements Action {
  readonly type = ${config.action.typesEnumName}.${name};

  ${getActionPayload(payload)}
}\n\n`;
}

export function addActionClassDeclaration(options: ActionSchema, stateDir: StateFilePaths): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, stateDir.actions);
    const typeDeclaration = findDeclarationNodeByName<ts.TypeAliasDeclaration>(
      sourceFile,
      config.action.collectiveTypeName
    );
    if (!typeDeclaration) {
      throw new Error(
        `${config.action.collectiveTypeName} type declaration does not exist in '${
          stateDir.actions
        }'.`
      );
    }

    const actionClass = getActionClass(options.name, options.payload);
    const change = new InsertChange(stateDir.actions, typeDeclaration.getStart() - 1, actionClass);
    const recorder = host.beginUpdate(stateDir.actions);
    recorder.insertLeft(change.pos, change.toAdd);
    host.commitUpdate(recorder);
  };
}
