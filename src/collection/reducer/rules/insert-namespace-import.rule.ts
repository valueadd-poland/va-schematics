import { Rule, Tree } from '@angular-devkit/schematics';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import * as ts from 'typescript';
import { insert, insertImport, isImported } from '../../../utils/ast.utils';
import { StateFilePaths } from '../../../utils/options-parsing.utils';

export function insertNamespaceImport(
  reducerSourceFile: ts.SourceFile,
  stateDir: StateFilePaths,
  actionsNamespace: string,
  isDefault = false
): Rule {
  return (host: Tree) => {
    const path = buildRelativePath(stateDir.reducer, stateDir.actions).slice(0, -3);

    if (!isImported(reducerSourceFile, actionsNamespace, path)) {
      insert(host, stateDir.reducer, [
        insertImport(reducerSourceFile, stateDir.reducer, actionsNamespace, path, isDefault)
      ]);
    }

    return host;
  };
}
