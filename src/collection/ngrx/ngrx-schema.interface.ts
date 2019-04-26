export interface NgrxSchema {
  directory: string;
  facade: boolean;
  module: string;
  name: string;
  onlyAddFiles: boolean;
  onlyEmptyRoot: boolean;
  root: boolean;
  skipFormat: boolean;
  skipPackageJson: boolean;
}
