import * as ts from 'typescript';
import { getSourceNodes } from './ast.utils';
import { capitalize } from './string.utils';

export function findActionsNamespace(actionsSourceFile: ts.SourceFile): string {
  const nodes = getSourceNodes(actionsSourceFile);
  let actionsNamespace = '';

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].kind === ts.SyntaxKind.NamespaceKeyword) {
      actionsNamespace = nodes[i + 1].getText();
      break;
    }
  }

  return actionsNamespace;
}

export function createActionImportAlias(actionPath: string): string {
  // hardcoded prefix of actions import e.g import * as fromAuthActions
  const importPrefix = '* as ';

  return importPrefix + createActionAliasName(actionPath);
}

export function createActionAliasName(actionPath: string): string {
  const aliasNamePrefix = 'from';
  // extract file name from the path e.g  /libs/test/lib/+state/old-syntax.actions.ts into old.syntax.actions.ts
  const actionFileName = actionPath.replace(/^.*[\\\/]/, '').replace('-', '.');
  // remove extension from the file name and transform it into array e.g from auth.actions.ts into [auth, actions]
  const actionFileNameChunksArray = actionFileName.split('.').slice(0, -1);
  // capitalize name chunks and join them with prefix to create action file name alias eg. fromAuthActions
  return (
    aliasNamePrefix + actionFileNameChunksArray.map(nameChunk => capitalize(nameChunk)).join('')
  );
}
