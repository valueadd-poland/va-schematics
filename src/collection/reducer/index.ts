import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseReducerWithCreator, parseReducerWithSwitch } from '../../utils/file-parsing.utils';
import { createActionAliasName, createActionImportAlias } from '../../utils/naming.utils';
import { parseStateDir } from '../../utils/options-parsing.utils';
import { formatFiles } from '../../utils/rules/format-files';
import { readIntoSourceFile } from '../../utils/ts.utils';
import { ReducerSchema } from './reducer-schema.interface';
import { insertActionsAliasImport } from './rules/insert-actions-alias-import.rule';
import { updateFacade } from './rules/update-facade.rule';
import { updateReducerSpec } from './rules/update-reducer-spec.rule';
import { updateReducer } from './rules/update-reducer.rule';
import { updateSelectorsSpec } from './rules/update-selectors-spec.rule';
import { updateSelectors } from './rules/update-selectors.rule';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function reducer(options: ReducerSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.actionName || !options.stateDir || !options.propsToUpdate) {
      throw new Error(`Please provide actionName, stateDir and propsToUpdate.`);
    }

    if (!host.getDir(options.stateDir)) {
      throw new Error(`Specified state directory path (${options.stateDir}) does not exist.`);
    }

    const stateDir = parseStateDir(options.stateDir, host);
    const actionAliasName = createActionAliasName(stateDir.actions);
    const reducerSourceFile = readIntoSourceFile(host, stateDir.reducer);
    const reducerSpecSourceFile = readIntoSourceFile(host, stateDir.reducerSpec);
    const selectorsSourceFile = readIntoSourceFile(host, stateDir.selectors);
    const selectorsSpecSourceFile = readIntoSourceFile(host, stateDir.selectorsSpec);
    const parsedReducerFile = options.creators
      ? parseReducerWithCreator(reducerSourceFile)
      : parseReducerWithSwitch(reducerSourceFile);

    const rules: Rule[] = [
      insertActionsAliasImport(
        reducerSourceFile,
        stateDir,
        createActionImportAlias(stateDir.actions),
        true
      ),
      updateReducer(reducerSourceFile, parsedReducerFile, actionAliasName, stateDir, options),
      updateReducerSpec(
        reducerSpecSourceFile,
        parsedReducerFile,
        actionAliasName,
        stateDir,
        options
      ),
      ...(options.selectors
        ? [
            updateSelectors(selectorsSourceFile, stateDir, options),
            updateSelectorsSpec(selectorsSpecSourceFile, stateDir, options)
          ]
        : []),
      ...(options.facade ? [updateFacade(options)] : []),
      formatFiles({ skipFormat: !!options.skipFormat })
    ];

    return chain(rules)(host, context);
  };
}
