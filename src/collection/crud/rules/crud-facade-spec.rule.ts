import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { findDescribeBlockNode, insert } from '../../../utils/ast.utils';
import { configureTestingModule } from '../../../utils/configure-testing-module.util';
import { insertCustomImport, insertTypeImport } from '../../../utils/import.utils';
import { toPropertyName } from '../../../utils/name.utils';
import { readIntoSourceFile } from '../../../utils/ts.utils';
import { CrudOptions } from '../index';

interface FacadeProp {
  expectedValue: string;
  name: string;
}

function getTestTemplate(
  options: CrudOptions,
  mapResponse: string,
  method: string,
  props: FacadeProp[],
  methodPayload = true
): string {
  const { dataService } = options;
  let response = '{}';

  if (mapResponse) {
    response = '{';
    const parts = mapResponse.split('.');
    parts.forEach(part => {
      response += `${part}: {`;
    });
    parts.forEach(() => {
      response += '}';
    });
    response += '}';
  }

  const propNames = props.map(prop => prop.name);
  const initialProps = props.map(
    prop => `let ${prop.name} = await readFirst(facade.${prop.name}$);`
  );
  const initialExpects = props.map(
    prop => `expect(${prop.name}).toEqual(initialState.${prop.name});`
  );
  const afterCallProps = props.map(prop => `${prop.name} = await readFirst(facade.${prop.name}$);`);
  const afterCallExpects = props.map(
    prop => `expect(${prop.name}).toEqual(${prop.expectedValue});`
  );

  return `\n\ndescribe('#${method}', () => {
    it('should set ${propNames.join(', ')}', async done => {
      try {
        ${initialProps.join('\n')}
        
        ${initialExpects.join('\n')}

        const response = ${response} as any;
        ${dataService.names.propertyName}.${method}.and.returnValue(of(response));
        facade.${method}(${methodPayload ? '{} as any' : ''});
        
        ${afterCallProps.join('\n')}
        
        ${afterCallExpects.join('\n')}

        done();
      } catch (err) {
        done.fail(err);
      }
    });
  });`;
}

function createCrudFacadeSpec(host: Tree, options: CrudOptions): Change[] {
  const { stateDir, toGenerate, response, entity } = options;
  const changes: Change[] = [];
  const sourceFile = readIntoSourceFile(host, stateDir.facadeSpec);
  const firstDescribeBlock = findDescribeBlockNode(sourceFile);
  const getEntityName = toPropertyName(`${entity.name}`);
  const entityName = toPropertyName(entity.name);

  if (!firstDescribeBlock) {
    throw new SchematicsException(`Describe block not found in ${stateDir.facadeSpec}`);
  }

  const describeBlock = findDescribeBlockNode(firstDescribeBlock);

  if (!describeBlock) {
    throw new SchematicsException(`Describe block not found in ${stateDir.facadeSpec}`);
  }

  const pos = describeBlock.getEnd() - 1;

  if (toGenerate.read) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getTestTemplate(options, response.read.map, `get${entity.name}`, [
          {
            name: `${getEntityName}`,
            expectedValue: 'response'
          },
          {
            name: `${getEntityName}Loading`,
            expectedValue: 'false'
          },
          {
            name: `${getEntityName}LoadError`,
            expectedValue: 'null'
          }
        ])
      )
    );

    if (options.collection) {
      changes.push(
        new InsertChange(
          stateDir.facadeSpec,
          pos,
          getTestTemplate(
            options,
            response.read.map,
            `get${entity.name}Collection`,
            [
              {
                name: `${getEntityName}Collection`,
                expectedValue: 'response'
              },
              {
                name: `${getEntityName}CollectionLoading`,
                expectedValue: 'false'
              },
              {
                name: `${getEntityName}CollectionLoadError`,
                expectedValue: 'null'
              }
            ],
            false
          )
        )
      );
    }
  }

  if (toGenerate.create) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getTestTemplate(options, response.create.map, `create${entity.name}`, [
          {
            name: `${entityName}Creating`,
            expectedValue: 'false'
          },
          {
            name: `${entityName}CreateError`,
            expectedValue: 'null'
          }
        ])
      )
    );
  }

  if (toGenerate.update) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getTestTemplate(options, response.update.map, `update${entity.name}`, [
          {
            name: `${entityName}Updating`,
            expectedValue: 'false'
          },
          {
            name: `${entityName}UpdateError`,
            expectedValue: 'null'
          }
        ])
      )
    );
  }

  if (toGenerate.delete) {
    changes.push(
      new InsertChange(
        stateDir.facadeSpec,
        pos,
        getTestTemplate(options, response.delete.map, `remove${entity.name}`, [
          {
            name: `${entityName}Removing`,
            expectedValue: 'false'
          },
          {
            name: `${entityName}RemoveError`,
            expectedValue: 'null'
          }
        ])
      )
    );
  }

  return changes;
}

export function crudFacadeSpec(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const { stateDir, dataService } = options;

    insert(host, stateDir.facadeSpec, createCrudFacadeSpec(host, options));

    configureTestingModule(host, stateDir.facadeSpec, [
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

    insertTypeImport(host, stateDir.facadeSpec, dataService.names.className);
    insertCustomImport(host, stateDir.facadeSpec, 'of', 'rxjs');
    insertCustomImport(host, stateDir.facadeSpec, 'getClassMethodsNames', '@valueadd/common');

    return host;
  };
}
