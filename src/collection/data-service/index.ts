import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { formatFiles } from '../../utils/rules/format-files';
import { DataServiceBackend, DataServiceSchema } from './data-service-schema';

export function dataService(options: DataServiceSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    switch (options.methodBackend) {
      case DataServiceBackend.None: {
        context.addTask(new RunSchematicTask('data-service-empty-method', options));
        break;
      }

      case DataServiceBackend.Http: {
        context.addTask(new RunSchematicTask('data-service-http-method', options));
        break;
      }

      case DataServiceBackend.LocalStorage: {
        context.addTask(new RunSchematicTask('data-service-local-storage-method', options));
        break;
      }
    }

    return chain([formatFiles({ skipFormat: options.skipFormat || false })])(host, context);
  };
}
