import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../utils/ast.utils';
import { SchematicCache } from '../../../utils/schematic-cache.util';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { action } from '../../action/index';
import { getRequestPayloadClass } from '../../data-service/utils/request-payload.utils';
import { CrudOptions } from '../index';

function createActionRules(options: CrudOptions): Rule[] {
  const { toGenerate, isCollection, entity, actionPrefix, statePath } = options;
  const rules: Rule[] = [];

  if (toGenerate.read) {
    rules.push(
      action({
        payload: isCollection ? undefined : getRequestPayloadClass(`Get${entity.name}`),
        name: `Get${entity.name}${isCollection ? 's' : ''}`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Get${entity.name}${isCollection ? 's' : ''}Fail`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: `${entity.name}${isCollection ? '[]' : ''}`,
        name: `Get${entity.name}${isCollection ? 's' : ''}Success`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.create) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Create${entity.name}`),
        name: `Create${entity.name}`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Create${entity.name}Fail`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: entity.name,
        name: `Create${entity.name}Success`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.update) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Update${entity.name}`),
        name: `Update${entity.name}`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Update${entity.name}Fail`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: entity.name,
        name: `Update${entity.name}Success`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  if (toGenerate.delete) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Remove${entity.name}`),
        name: `Remove${entity.name}`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Remove${entity.name}Fail`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      }),
      action({
        name: `Remove${entity.name}Success`,
        prefix: actionPrefix,
        stateDir: statePath,
        skipFormat: true
      })
    );
  }

  return rules;
}

export function crudActions(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating crud actions.`);
    SchematicCache.getInstance().clear('hostFiles');
    const actions = options.stateDir.actions;
    const actionsSourceFile = readIntoSourceFile(host, actions);
    insert(host, actions, [
      insertImport(actionsSourceFile, actions, 'HttpErrorResponse', '@angular/common/http')
    ]);

    return chain(createActionRules(options))(host, context);
  };
}
