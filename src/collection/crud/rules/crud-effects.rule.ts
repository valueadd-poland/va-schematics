import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { insert } from '../../../utils/ast.utils';
import { configureTestingModule } from '../../../utils/configure-testing-module.util';
import { insertConstructorArguments } from '../../../utils/constructor.utils';
import { insertCustomImport, insertTypeImport } from '../../../utils/import.utils';
import { names } from '../../../utils/name.utils';
import { findByIdentifier, findClassBodyInFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { CrudOptions } from '../index';

function getEffectSpecTemplate(
  options: CrudOptions,
  actionName: string,
  actionPayload = true
): string {
  const { actionsNamespace, dataService } = options;
  const actionNames = names(actionName);
  const payload = actionPayload ? '{} as any' : '';

  return `\n\ndescribe('${actionNames.propertyName}$', () => {
    it('should be successful', () => {
      const payload = {} as any;
      const action = new ${actionsNamespace}.${actionNames.className}(${payload});
      const completion = new ${actionsNamespace}.${actionNames.className}Success(payload);
      
      actions = hot('-a', {a: action});
      const response = cold('--b|', {b: payload});
      const expected = cold('---c', {c: completion});
      ${dataService.names.propertyName}.${actionNames.propertyName}.and.returnValue(response);
      
      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
      expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
    });
    
    it('should fail', () => {
      const payload = {} as any;
      const action = new ${actionsNamespace}.${actionNames.className}(${payload});
      const completion = new ${actionsNamespace}.${actionNames.className}Fail(payload);

      actions = hot('-a', { a: action });
      const response = cold('-#', {}, payload);
      const expected = cold('--c', { c: completion });
      ${dataService.names.propertyName}.${actionNames.propertyName}.and.returnValue(response);

      expect(effects.${actionNames.propertyName}$).toBeObservable(expected);
      expect(${dataService.names.propertyName}.${actionNames.propertyName}).toHaveBeenCalled();
    });
  });`;
}

function getEffectFetchTemplate(
  options: CrudOptions,
  actionName: string,
  actionPayload = true
): string {
  const { actionsNamespace } = options;
  const actionNames = names(actionName);
  const payload = actionPayload ? 'action.payload' : '';

  return `@Effect()
  ${actionNames.propertyName}$ = this.dp.fetch(${actionsNamespace}.${config.action.typesEnumName}.${actionNames.className}, {
    id: () => {},
    run: (action: ${actionsNamespace}.${actionNames.className}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(${payload})
        .pipe(map(data => new ${actionsNamespace}.${actionNames.className}Success(data)));
    },
    onError: (action: ${actionsNamespace}.${actionNames.className}, error: HttpErrorResponse) => {
      return new ${actionsNamespace}.${actionNames.className}Fail(error);
    }
  });\n\n`;
}

function getEffectUpdateTemplate(
  options: CrudOptions,
  actionName: string,
  update: 'pessimistic' | 'optimistic',
  successPayload?: string
): string {
  const { actionsNamespace } = options;
  const actionNames = names(actionName);

  return `@Effect()
  ${actionNames.propertyName}$ = this.dp.${update}Update(${actionsNamespace}.${
    config.action.typesEnumName
  }.${actionNames.className}, {
    run: (action: ${actionsNamespace}.${actionNames.className}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(action.payload)
        .pipe(map(data => new ${actionsNamespace}.${
    actionNames.className
  }Success(${successPayload || 'data'})));
    },
    onError: (action: ${actionsNamespace}.${actionNames.className}, error: HttpErrorResponse) => {
      return new ${actionsNamespace}.${actionNames.className}Fail(error);
    }
  });\n\n`;
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
      type: `jasmine.SpyObj<${dataService.names.className}>`,
      config: {
        assign: dataService.names.className,
        metadataField: 'providers',
        value: `{
          provide: ${dataService.names.className},
          useValue: jasmine.createSpyObj(
            '${dataService.names.propertyName}',
            getClassMethodsNames(${dataService.names.className})
          )
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
        getEffectSpecTemplate(options, `Get${entity.name}`)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        getEffectSpecTemplate(options, `Get${entity.name}Collection`, true)
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        getEffectSpecTemplate(options, `Create${entity.name}`)
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        getEffectSpecTemplate(options, `Update${entity.name}`)
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        describeFnSecondArgument.getEnd() - 1,
        getEffectSpecTemplate(options, `Remove${entity.name}`)
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
        getEffectFetchTemplate(options, `Get${entity.name}`)
      )
    );
  }

  if (toGenerate.readCollection) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        getEffectFetchTemplate(options, `Get${entity.name}Collection`)
      )
    );
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        getEffectUpdateTemplate(options, `Create${entity.name}`, 'pessimistic')
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        getEffectUpdateTemplate(options, `Update${entity.name}`, 'pessimistic')
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        getEffectUpdateTemplate(options, `Remove${entity.name}`, 'pessimistic', 'action.payload')
      )
    );
  }

  return changes;
}

export function crudEffects(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating effects.`);

    const { actionsNamespace, dataService, stateDir, statePartialName } = options;

    insertConstructorArguments(host, options.stateDir.effects, [
      {
        accessModifier: 'private',
        name: dataService.names.propertyName,
        type: dataService.names.className
      },
      {
        accessModifier: 'private',
        name: 'dp',
        type: `DataPersistence<${options.statePartialName}>`
      }
    ]);

    insertTypeImport(host, stateDir.effects, dataService.names.className);
    insertTypeImport(host, stateDir.effects, `DataPersistence`);
    insertTypeImport(host, stateDir.effects, statePartialName);
    insertCustomImport(host, stateDir.effects, 'HttpErrorResponse', '@angular/common/http');
    insertCustomImport(host, stateDir.effects, 'map', 'rxjs/operators');

    insertTypeImport(host, stateDir.effectsSpec, actionsNamespace);
    insertTypeImport(host, stateDir.effectsSpec, dataService.names.className);
    insertTypeImport(host, stateDir.effectsSpec, `DataPersistence`);
    insertCustomImport(host, stateDir.effectsSpec, 'hot', 'jasmine-marbles');
    insertCustomImport(host, stateDir.effectsSpec, 'cold', 'jasmine-marbles');
    insertCustomImport(host, stateDir.effectsSpec, 'getClassMethodsNames', '@valueadd/common');

    insert(host, stateDir.effects, createEffects(host, options));
    insert(host, stateDir.effectsSpec, createEffectsSpec(host, options));

    return host;
  };
}
