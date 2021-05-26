enum Backend {
  LocalStorage = 'localStorage',
  Http = 'http'
}

export interface ActionSchema {
  backend?: Backend;
  name: string;
  payload?: string;
  prefix: string;
  skipFormat?: boolean;
  stateDir: string;
  /**
   * Specifies whether to use creator functions for
   * handling actions and reducers.
   */
  creators?: boolean;
}
