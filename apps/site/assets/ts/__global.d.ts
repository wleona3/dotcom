interface Window {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Turbolinks: any;
  decodeURIComponent(component: string): string;
  encodeURIComponent(component: string): string;
  google: any;
  Cypress: any;
  __REDUX_DEVTOOLS_EXTENSION__: any;
  store: any;
}

declare module "*.svg" {
  const content: any;
  export default content;
}
