export interface ReducerSchema {
  actionName: string;
  propsToUpdate: string;
  selectors: boolean;
  stateDir: string;
  skipFormat?: boolean;
  actionPayload?: boolean;
}
