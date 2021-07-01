export interface ReducerSchema {
  actionName: string;
  propsToUpdate: string;
  selectors: boolean;
  stateDir: string;
  skipFormat?: boolean;
  actionPayload?: boolean;
  facade?: boolean;
  /**
   * Specifies whether to use creator functions for
   * handling actions and reducers.
   */
  creators?: boolean;
}
