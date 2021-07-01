import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { StateFilePaths } from '../../../utils/options-parsing.utils';
import { camelize } from '../../../utils/string.utils';
import {
  findDeclarationNodeByName,
  findDeclarationNodeBySyntaxKind,
  readIntoSourceFile
} from '../../../utils/ts.utils';
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

function createActionCreator(options: ActionSchema): string {
  return (
    `\n\n` +
    `export const ${camelize(options.name)} = createAction(\n` +
    `  ${config.action.typesEnumName}.${options.name}\n` +
    `  ${getActionCreatorPayload(options.payload)}` +
    ');'
  );
}

function getActionCreatorPayload(payload: string | undefined): string {
  return payload ? `,props<{ payload: ${payload}}>()\n` : '';
}

function getTypeDeclarationPosition(sourceFile, stateDir: StateFilePaths): number {
  const typeDeclaration = findDeclarationNodeByName<ts.TypeAliasDeclaration>(
    sourceFile,
    config.action.collectiveTypeName
  );

  if (!typeDeclaration) {
    throw new Error(
      `${config.action.collectiveTypeName} type declaration does not exist in '${stateDir.actions}'.`
    );
  }

  return typeDeclaration.getStart();
}

function getEndOfTheFilePosition(sourceFile): number {
  return (
    findDeclarationNodeBySyntaxKind<ts.EndOfFileToken>(
      sourceFile,
      ts.SyntaxKind.EndOfFileToken
    ) as ts.EndOfFileToken
  ).end;
}

function getInsertPosition(options: ActionSchema, stateDir: StateFilePaths, sourceFile): number {
  return (
    (options.creators
      ? getEndOfTheFilePosition(sourceFile)
      : getTypeDeclarationPosition(sourceFile, stateDir)) - 1
  );
}

export function addActionDeclaration(options: ActionSchema, stateDir: StateFilePaths): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, stateDir.actions);

    const actionDeclaration = options.creators
      ? createActionCreator(options)
      : getActionClass(options.name, options.payload);
    const change = new InsertChange(
      stateDir.actions,
      getInsertPosition(options, stateDir, sourceFile),
      actionDeclaration
    );
    const recorder = host.beginUpdate(stateDir.actions);
    recorder.insertLeft(change.pos, change.toAdd);
    host.commitUpdate(recorder);
  };
}
