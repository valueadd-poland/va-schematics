import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { NgrxSchema } from './ngrx-schema.interface';

const collectionPath = path.join(__dirname, '../../collection.json');

describe('ngrx', () => {
  it('works', () => {
    const runner = new SchematicTestRunner('schematics', collectionPath);
    const tree = runner.runSchematic<NgrxSchema>(
      'ngrx',
      {
        name: 'state',
        module: 'apps/myapp/src/app/app.module.ts',
        onlyEmptyRoot: true
      },
      Tree.empty()
    );

    expect(tree.files).toEqual([]);
  });
});
