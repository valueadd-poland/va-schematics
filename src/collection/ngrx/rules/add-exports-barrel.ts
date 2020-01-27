import { Rule, Tree } from '@angular-devkit/schematics';
import * as path from 'path';
import * as ts from 'typescript';
import { addGlobal, insert } from '../../../utils/ast.utils';

import { names } from '../../../utils/name.utils';
import { NgrxSchema } from '../ngrx-schema.interface';

/**
 * Add ngrx feature exports to the public barrel in the feature library
 */
export function addExportsToBarrel(options: NgrxSchema): Rule {
  return (host: Tree) => {
    if (!host.exists(options.module)) {
      throw new Error(`Specified module path (${options.module}) does not exist`);
    }

    // Only update the public barrel for feature libraries
    if (!options.root) {
      const moduleDir = path.dirname(options.module);
      const indexFilePath = path.join(moduleDir, '../index.ts');
      const hasFacade = options.facade;

      const buffer = host.read(indexFilePath);
      if (!!buffer) {
        // AST to 'index.ts' barrel for the public API
        const indexSource = buffer.toString('utf-8');
        const indexSourceFile = ts.createSourceFile(
          indexFilePath,
          indexSource,
          ts.ScriptTarget.Latest,
          true
        );

        // Public API for the feature interfaces, selectors, and facade
        const { fileName } = names(options.name);
        const statePath = `./lib/${options.directory}/${fileName}`;

        insert(host, indexFilePath, [
          ...(hasFacade
            ? addGlobal(indexSourceFile, indexFilePath, `export * from '${statePath}.facade';`)
            : []),
          ...addGlobal(indexSourceFile, indexFilePath, `export * from '${statePath}.reducer';`),
          ...addGlobal(indexSourceFile, indexFilePath, `export * from '${statePath}.selectors';`)
        ]);
      }
    }

    return host;
  };
}
