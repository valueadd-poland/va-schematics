import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../utils/ast.utils';
import { SchematicCache } from '../../../utils/schematic-cache.util';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { action } from '../../action/index';
import { getRequestPayloadClass } from '../../data-service/utils/request-payload.utils';
import { CrudOptions } from '../index';

function createActionRules(options: CrudOptions): Rule[] {
  const { toGenerate, entity, actionPrefix, statePath } = options;
  const rules: Rule[] = [];
  const genericOptions = {
    prefix: actionPrefix,
    stateDir: statePath,
    skipFormat: true,
    creators: options.creators
  };

  if (toGenerate.read) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Get${entity.name}`),
        name: `Get${entity.name}`,
        ...genericOptions
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Get${entity.name}Fail`,
        ...genericOptions
      }),
      action({
        payload: `${entity.name}`,
        name: `Get${entity.name}Success`,
        ...genericOptions
      })
    );
  }

  if (toGenerate.readCollection) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Get${entity.name}Collection`),
        name: `Get${entity.name}Collection`,
        ...genericOptions
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Get${entity.name}CollectionFail`,
        ...genericOptions
      }),
      action({
        payload: `${entity.name}[]`,
        name: `Get${entity.name}CollectionSuccess`,
        ...genericOptions
      })
    );
  }

  if (toGenerate.create) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Create${entity.name}`),
        name: `Create${entity.name}`,
        ...genericOptions
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Create${entity.name}Fail`,
        ...genericOptions
      }),
      action({
        payload: entity.name,
        name: `Create${entity.name}Success`,
        ...genericOptions
      })
    );
  }

  if (toGenerate.update) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Update${entity.name}`),
        name: `Update${entity.name}`,
        ...genericOptions
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Update${entity.name}Fail`,
        ...genericOptions
      }),
      action({
        payload: entity.name,
        name: `Update${entity.name}Success`,
        ...genericOptions
      })
    );
  }

  if (toGenerate.delete) {
    rules.push(
      action({
        payload: getRequestPayloadClass(`Remove${entity.name}`),
        name: `Remove${entity.name}`,
        ...genericOptions
      }),
      action({
        payload: 'HttpErrorResponse',
        name: `Remove${entity.name}Fail`,
        ...genericOptions
      }),
      action({
        payload: getRequestPayloadClass(`Remove${entity.name}`),
        name: `Remove${entity.name}Success`,
        ...genericOptions
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
