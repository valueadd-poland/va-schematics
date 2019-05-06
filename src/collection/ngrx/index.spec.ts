import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';
import { createApp, createEmptyWorkspace, runSchematic } from '../../utils/testing.utils';
import { NgrxSchema } from './ngrx-schema.interface';

describe('ngrx', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createEmptyWorkspace(appTree);
    appTree = createApp(appTree, 'myapp');
  });

  it('should add empty root', async () => {
    const tree = await runSchematic(
      'ngrx',
      {
        name: 'state',
        module: 'apps/myapp/src/app/app.module.ts',
        onlyEmptyRoot: true
      } as NgrxSchema,
      appTree
    );
    const appModule = getFileContent(tree, '/apps/myapp/src/app/app.module.ts');

    expect(tree.exists('apps/myapp/src/app/+state/state.actions.ts')).toBeFalsy();

    expect(appModule).toContain('StoreModule.forRoot(');
    expect(appModule).toContain('{ metaReducers : !environment.production ? [storeFreeze] : [] }');
    expect(appModule).toContain('EffectsModule.forRoot');
  });
});
