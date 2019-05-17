import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { insert } from '../../../utils/ast.utils';
import { configureTestingModule } from '../../../utils/configure-testing-module.util';
import { insertConstructorArguments } from '../../../utils/constructor.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { names } from '../../../utils/name.utils';
import { findClassBodyInFile } from '../../../utils/ts.utils';
import { config } from '../../config';
import { CrudOptions } from '../index';

function getEffectSpecTemplate(options: CrudOptions, actionName: string): string {
  const { actionsNamespace } = options;
  const actionNames = names(actionName);

  return ``;
}

function getEffectFetchTemplate(options: CrudOptions, actionName: string): string {
  const { actionsNamespace } = options;
  const actionNames = names(actionName);

  return `@Effect()
  ${actionNames.propertyName}$ = this.dp.fetch(${actionsNamespace}.${config.action.typesEnumName}.${
    actionNames.className
  }, {
    id: () => {},
    run: (action: ${actionsNamespace}.${actionNames.className}) => {
      return this.${options.dataService.names.propertyName}
        .${actionNames.propertyName}(action.payload)
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
  update: 'pessimistic' | 'optimistic'
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
        .pipe(map(data => new ${actionsNamespace}.${actionNames.className}Success(data)));
    },
    onError: (action: ${actionsNamespace}.${actionNames.className}, error: HttpErrorResponse) => {
      return new ${actionsNamespace}.${actionNames.className}Fail(error);
    }
  });\n\n`;
}

function createEffects(host: Tree, options: CrudOptions): Change[] {
  const changes: Change[] = [];
  const { toGenerate, isCollection, entity, stateDir } = options;
  const effectsFilePath = stateDir.effects;
  const classBody = findClassBodyInFile(host, effectsFilePath);

  if (toGenerate.read) {
    changes.push(
      new InsertChange(
        effectsFilePath,
        classBody.getStart(),
        getEffectFetchTemplate(options, `Get${entity.name}${isCollection ? 's' : ''}`)
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
        getEffectUpdateTemplate(options, `Remove${entity.name}`, 'pessimistic')
      )
    );
  }

  return changes;
}

export function crudEffects(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating effects.`);

    const { dataService, stateDir, statePartialName, effects } = options;

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

    insert(host, stateDir.effects, createEffects(host, options));

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
        type: dataService.names.className,
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

    return host;
  };
}
