import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { insert } from '../../../utils/ast.utils';
import { configureTestingModule } from '../../../utils/configure-testing-module.util';
import { insertConstructorArguments } from '../../../utils/constructor.utils';
import { insertCustomImport, insertTypeImport } from '../../../utils/import.utils';
import { names } from '../../../utils/name.utils';
import { camelize } from '../../../utils/string.utils';
import { findByIdentifier, findClassBodyInFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { CrudGenerate, CrudOptions } from '../index';

function getEffectSpecTemplate(
  options: CrudOptions,
  actionName: string,
  actionPayload = true
): string {
  const { actionsAliasName, dataService } = options;
  const actionNames = names(actionName);
  const payload = actionPayload ? '{} as any' : '';

  return `\n\ndescribe('${actionNames.propertyName}$', () => {
    test('returns ${actionNames.className}Success action on success', () => {
      const payload = {} as any;
      const action = new ${actionsAliasName}.${actionNames.className}(${payload});
      const completion = new ${actionsAliasName}.${actionNames.className}Success(payload);

      actions = hot('-a', {a: action});
      const response = cold('--b|', {b: payload});
      const expected = cold('---c', {c: completion});
      ${dataService.names.propertyName}.${actionNames.propertyName}.mockReturnValue(response);

      expect(effects.${actionNames.propertyName}$).toSatisfyOnFlush(() => {
        expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
      });
      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
    });

    test('returns ${actionNames.className}Fail action on fail', () => {
      const payload = {} as any;
      const action = new ${actionsAliasName}.${actionNames.className}(${payload});
      const completion = new ${actionsAliasName}.${actionNames.className}Fail(payload);

      actions = hot('-a', { a: action });
      const response = cold('-#', {}, payload);
      const expected = cold('--c', { c: completion });
      ${dataService.names.propertyName}.${actionNames.propertyName}.mockReturnValue(response);

      expect(effects.${actionNames.propertyName}$).toSatisfyOnFlush(() => {
        expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
      });
      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
    });
  });`;
}

function getEffectCreatorsSpecTemplate(
  options: CrudOptions,
  actionName: string,
  actionPayload = true
): string {
  const { actionsAliasName, dataService } = options;
  const actionNames = names(actionName);
  const payload = actionPayload ? '{} as any' : '';

  return `\n\ndescribe('${actionNames.propertyName}$', () => {
    test('returns ${actionNames.className}Success action on success', () => {
      const payload = {} as any;
      const action = ${actionsAliasName}.${camelize(actionNames.className)}(${payload});
      const completion = ${actionsAliasName}.${camelize(actionNames.className)}Success(payload);

      actions = hot('-a', {a: action});
      const response = cold('--b|', {b: payload});
      const expected = cold('---c', {c: completion});
      ${dataService.names.propertyName}.${actionNames.propertyName}.mockReturnValue(response);

      expect(effects.${actionNames.propertyName}$).toSatisfyOnFlush(() => {
        expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
      });
      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
    });

    test('returns ${actionNames.className}Fail action on fail', () => {
      const payload = {} as any;
      const action = ${actionsAliasName}.${camelize(actionNames.className)}(${payload});
      const completion = ${actionsAliasName}.${camelize(actionNames.className)}Fail(payload);

      actions = hot('-a', { a: action });
      const response = cold('-#', {}, payload);
      const expected = cold('--c', { c: completion });
      ${dataService.names.propertyName}.${actionNames.propertyName}.mockReturnValue(response);

      expect(effects.${actionNames.propertyName}$).toSatisfyOnFlush(() => {
        expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
      });
      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
    });
  });`;
}

function getEffectFetchTemplate(
  options: CrudOptions,
  actionName: string,
  actionPayload = true
): string {
  const { actionsAliasName } = options;
  const actionNames = names(actionName);
  const payload = actionPayload ? 'action.payload' : '';

  return `@Effect()
  ${actionNames.propertyName}$ = this.dp.fetch(${actionsAliasName}.${config.action.typesEnumName}.${actionNames.className}, {
    id: () => {},
    run: (action: ${actionsAliasName}.${actionNames.className}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(${payload})
        .pipe(map(data => new ${actionsAliasName}.${actionNames.className}Success(data)));
    },
    onError: (action: ${actionsAliasName}.${actionNames.className}, error: HttpErrorResponse) => {
      return new ${actionsAliasName}.${actionNames.className}Fail(error);
    }
  });\n\n`;
}

function getEffectCreatorFetchTemplate(options: CrudOptions, actionName: string): string {
  const { actionsAliasName } = options;
  const actionNames = names(actionName);

  return `${actionNames.propertyName}$ = createEffect(() => this.actions$.pipe(
  ofType(${actionsAliasName}.${camelize(actionNames.className)}),
  fetch({
    id: () => {},
    run: ({payload}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(payload)
        .pipe(map(data => ${actionsAliasName}.${camelize(
    actionNames.className
  )}Success({payload: data})));
    },
    onError: (action, error: HttpErrorResponse) => {
      return ${actionsAliasName}.${camelize(actionNames.className)}Fail({payload: error});
    }
  })
  )
  );\n\n`;
}

function getEffectUpdateTemplate(
  options: CrudOptions,
  actionName: string,
  update: 'pessimistic' | 'optimistic',
  successPayload?: string
): string {
  const { actionsAliasName } = options;
  const actionNames = names(actionName);

  return `@Effect()
  ${actionNames.propertyName}$ = this.dp.${update}Update(${actionsAliasName}.${
    config.action.typesEnumName
  }.${actionNames.className}, {
    run: (action: ${actionsAliasName}.${actionNames.className}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(action.payload)
        .pipe(map(data => new ${actionsAliasName}.${actionNames.className}Success(${
    successPayload || 'data'
  })));
    },
    onError: (action: ${actionsAliasName}.${actionNames.className}, error: HttpErrorResponse) => {
      return new ${actionsAliasName}.${actionNames.className}Fail(error);
    }
  });\n\n`;
}

function getEffectCreatorUpdateTemplate(
  options: CrudOptions,
  actionName: string,
  update: 'pessimistic' | 'optimistic',
  successPayload?: string
): string {
  const { actionsAliasName } = options;
  const actionNames = names(actionName);

  return `${actionNames.propertyName}$ = createEffect(() => this.actions$.pipe(
  ofType(${actionsAliasName}.${camelize(actionNames.className)}),
  ${update}Update({
    run: ({payload}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(payload)
        .pipe(map(data => ${actionsAliasName}.${camelize(actionNames.className)}Success(${
    successPayload || '{payload: data}'
  })));
    },
    onError: (action, error: HttpErrorResponse) => {
      return ${actionsAliasName}.${camelize(actionNames.className)}Fail({payload: error});
    }
  })
  )
  );\n\n`;
}

function createEffectsSpec(host: Tree, options: CrudOptions): Change[] {
  const { entity, toGenerate, stateDir, dataService, effects } = options;
  const changes: Change[] = [];

  configureTestingModule(host, stateDir.effectsSpec, [
    {
      name: 'actions',
      type: 'Observable<any>',
      config: {
        metadataField: 'providers',
        value: `provideMockActions(() => actions)`
      }
    },
    {
      name: 'effects',
      type: effects.name,
      config: {
        assign: effects.name,
        metadataField: 'providers',
        value: effects.name
      }
    },
    {
      name: dataService.names.propertyName,
      type: `jest.Mocked<${dataService.names.className}>`,
      config: {
        assign: dataService.names.className,
        assignWithTypeCast: true,
        metadataField: 'providers',
        value: `{
          provide: ${dataService.names.className},
          useValue: createSpyObj(${dataService.names.className})
        }`
      }
    }
  ]);

  const describeFn = findByIdentifier<ts.CallExpression>(host, stateDir.effectsSpec, 'describe');
  const describeFnSecondArgument = describeFn.arguments[1];

  if (!describeFnSecondArgument) {
    throw new SchematicsException(
      `Expecting second argument in describe function call in ${stateDir.effectsSpec}.`
    );
  }

  const effectsFilePath = stateDir.effects;

  if (toGenerate.read) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        options.creators
          ? getEffectCreatorsSpecTemplate(options, `Get${entity.name}`)
          : getEffectSpecTemplate(options, `Get${entity.name}`)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        options.creators
          ? getEffectCreatorsSpecTemplate(options, `Get${entity.name}Collection`, true)
          : getEffectSpecTemplate(options, `Get${entity.name}Collection`, true)
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        options.creators
          ? getEffectCreatorsSpecTemplate(options, `Create${entity.name}`)
          : getEffectSpecTemplate(options, `Create${entity.name}`)
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        options.creators
          ? getEffectCreatorsSpecTemplate(options, `Update${entity.name}`)
          : getEffectSpecTemplate(options, `Update${entity.name}`)
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        options.creators
          ? getEffectCreatorsSpecTemplate(options, `Remove${entity.name}`)
          : getEffectSpecTemplate(options, `Remove${entity.name}`)
      )
    );
  }

  return changes;
}

function createEffects(host: Tree, options: CrudOptions): Change[] {
  const changes: Change[] = [];
  const { toGenerate, entity, stateDir } = options;
  const effectsFilePath = stateDir.effects;
  const classBody = findClassBodyInFile(host, effectsFilePath);

  if (toGenerate.read) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        options.creators
          ? getEffectCreatorFetchTemplate(options, `Get${entity.name}`)
          : getEffectFetchTemplate(options, `Get${entity.name}`)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        options.creators
          ? getEffectCreatorFetchTemplate(options, `Get${entity.name}Collection`)
          : getEffectFetchTemplate(options, `Get${entity.name}Collection`)
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        options.creators
          ? getEffectCreatorUpdateTemplate(options, `Create${entity.name}`, 'pessimistic')
          : getEffectUpdateTemplate(options, `Create${entity.name}`, 'pessimistic')
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        options.creators
          ? getEffectCreatorUpdateTemplate(options, `Update${entity.name}`, 'pessimistic')
          : getEffectUpdateTemplate(options, `Update${entity.name}`, 'pessimistic')
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        options.creators
          ? getEffectCreatorUpdateTemplate(
              options,
              `Remove${entity.name}`,
              'pessimistic',
              '{payload}'
            )
          : getEffectUpdateTemplate(
              options,
              `Remove${entity.name}`,
              'pessimistic',
              'action.payload'
            )
      )
    );
  }

  return changes;
}

export function crudEffects(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating effects.`);

    const { actionsAliasName, dataService, stateDir, statePartialName } = options;

    insertConstructorArguments(host, options.stateDir.effects, [
      {
        accessModifier: 'private',
        name: dataService.names.propertyName,
        type: dataService.names.className
      }
    ]);

    if (!options.creators) {
      insertConstructorArguments(host, options.stateDir.effects, [
        {
          accessModifier: 'private',
          name: 'dp',
          type: `DataPersistence<${options.statePartialName}>`
        }
      ]);
    }

    insertTypeImport(host, stateDir.effects, dataService.names.className);
    options.creators
      ? insertEffectCreatorPersistenceFunctions(host, stateDir.effects, options.toGenerate)
      : insertTypeImport(host, stateDir.effects, `DataPersistence`);
    insertTypeImport(host, stateDir.effects, statePartialName);
    insertCustomImport(host, stateDir.effects, 'HttpErrorResponse', '@angular/common/http');
    insertCustomImport(host, stateDir.effects, 'map', 'rxjs/operators');

    insertTypeImport(host, stateDir.effectsSpec, actionsAliasName);
    insertTypeImport(host, stateDir.effectsSpec, dataService.names.className);
    options.creators
      ? insertEffectCreatorPersistenceFunctions(host, stateDir.effectsSpec, options.toGenerate)
      : insertTypeImport(host, stateDir.effectsSpec, `DataPersistence`);
    insertCustomImport(host, stateDir.effectsSpec, 'hot', 'jest-marbles');
    insertCustomImport(host, stateDir.effectsSpec, 'cold', 'jest-marbles');
    insertCustomImport(host, stateDir.effectsSpec, 'createSpyObj', 'jest-createspyobj');

    insert(host, stateDir.effects, createEffects(host, options));
    insert(host, stateDir.effectsSpec, createEffectsSpec(host, options));

    return host;
  };
}

const insertEffectCreatorPersistenceFunctions = (
  host: Tree,
  directory: string,
  toGenerate: CrudGenerate
): void => {
  if (toGenerate.read || toGenerate.readCollection) {
    insertCustomImport(host, directory, 'fetch', '@nrwl/angular');
  }
  if (toGenerate.create || toGenerate.delete || toGenerate.update) {
    insertCustomImport(host, directory, 'pessimisticUpdate', '@nrwl/angular');
  }
};
