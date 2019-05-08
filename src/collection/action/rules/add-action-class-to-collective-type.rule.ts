import { Rule, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, ReplaceChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { insert } from '../../../utils/ast.utils';
import { StateFilePaths } from '../../../utils/options-parsing.utils';
import { findDeclarationNodeByName, readIntoSourceFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { ActionSchema } from '../action-schema.interface';

export function addActionClassToCollectiveType(
  options: ActionSchema,
  stateDir: StateFilePaths
): Rule {
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

    const changes: Change[] = [];

    if (typeDeclaration.type.getText() === 'Action') {
      changes.push(
        new ReplaceChange(stateDir.actions, typeDeclaration.type.getStart(), 'Action', options.name)
      );
    } else {
      changes.push(
        new InsertChange(stateDir.actions, typeDeclaration.type.getEnd(), ' |\n' + options.name)
      );
    }

    insert(host, stateDir.actions, changes);
  };
}
