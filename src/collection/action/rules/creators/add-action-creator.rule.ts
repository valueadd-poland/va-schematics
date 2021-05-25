import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { StateFilePaths } from '../../../../utils/options-parsing.utils';
import { classify } from '../../../../utils/string.utils';
import { findDeclarationNodeBySyntaxKind, readIntoSourceFile } from '../../../../utils/ts.utils';
import { ActionSchema } from '../../action-schema.interface';

export function addActionCreator(options: ActionSchema, stateDir: StateFilePaths): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, stateDir.actions);
    const action = createActionCreator(options);

    const endFileDeclaration = findDeclarationNodeBySyntaxKind<ts.EndOfFileToken>(
      sourceFile,
      ts.SyntaxKind.EndOfFileToken
    ) as ts.EndOfFileToken;

    const change = new InsertChange(stateDir.actions, endFileDeclaration.end, action);

    const recorder = host.beginUpdate(stateDir.actions);
    recorder.insertLeft(change.pos, change.toAdd);
    host.commitUpdate(recorder);

    return host;
  };
}

function createActionCreator(options: ActionSchema): string {
  return (
    `\n\n` +
    `export const ${options.prefix.toLocaleLowerCase()}${classify(
      options.name
    )} = createAction(\n` +
    `  '[${classify(options.name)}] ${classify(options.prefix)} ${classify(options.name)}'\n` +
    `  ${getActionCreatorPayload(options.payload)}` +
    ');'
  );
}

function getActionCreatorPayload(payload: string | undefined): string {
  return payload ? `,props<{ payload: ${payload}}>()\n` : '';
}
