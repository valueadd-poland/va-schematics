import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { splitPascalCase } from '../../../utils/name.utils';
import { StateFilePaths } from '../../../utils/options-parsing.utils';
import { findDeclarationNodeByName, readIntoSourceFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { ActionSchema } from '../action-schema.interface';

export function addActionType(options: ActionSchema, stateDir: StateFilePaths): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, stateDir.actions);
    const enumDeclaration = findDeclarationNodeByName<ts.EnumDeclaration>(
      sourceFile,
      config.action.typesEnumName
    );

    if (!enumDeclaration) {
      throw new Error(
        `${config.action.typesEnumName} enum declaration does not exist in '${stateDir.actions}'.`
      );
    }

    let enumMember = `${options.name} = '[${options.prefix}] ${splitPascalCase(options.name)}'`;
    enumMember =
      enumDeclaration.members.hasTrailingComma || !enumDeclaration.members.length
        ? enumMember
        : ',' + enumMember;

    const change = new InsertChange(stateDir.actions, enumDeclaration.end - 1, enumMember);
    const recorder = host.beginUpdate(stateDir.actions);
    recorder.insertLeft(change.pos, change.toAdd);
    host.commitUpdate(recorder);
  };
}
