import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseReducerFile } from '../../utils/file-parsing.utils';
import { findActionsNamespace } from '../../utils/naming.utils';
import { parseStateDir } from '../../utils/options-parsing.utils';
import { formatFiles } from '../../utils/rules/format-files';
import { readIntoSourceFile } from '../../utils/ts.utils';
import { ReducerSchema } from './reducer-schema.interface';
import { insertNamespaceImport } from './rules/insert-namespace-import.rule';
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
    const actionsSourceFile = readIntoSourceFile(host, stateDir.actions);
    const actionsNamespace = findActionsNamespace(actionsSourceFile);
    const reducerSourceFile = readIntoSourceFile(host, stateDir.reducer);
    const reducerSpecSourceFile = readIntoSourceFile(host, stateDir.reducerSpec);
    const selectorsSourceFile = readIntoSourceFile(host, stateDir.selectors);
    const selectorsSpecSourceFile = readIntoSourceFile(host, stateDir.selectorsSpec);
    const parsedReducerFile = parseReducerFile(reducerSourceFile);

    const rules: Rule[] = [
      insertNamespaceImport(reducerSourceFile, stateDir, actionsNamespace),
      updateReducer(reducerSourceFile, parsedReducerFile, actionsNamespace, stateDir, options),
      updateReducerSpec(
        reducerSpecSourceFile,
        parsedReducerFile,
        actionsNamespace,
        stateDir,
        options
      ),
      ...(options.selectors
        ? [
            updateSelectors(selectorsSourceFile, stateDir, options),
            updateSelectorsSpec(selectorsSpecSourceFile, stateDir, options)
          ]
        : []),
      formatFiles()
    ];

    return chain(rules)(host, context);
  };
}
