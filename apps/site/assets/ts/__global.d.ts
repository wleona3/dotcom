interface Window {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Turbolinks: any;
  decodeURIComponent(component: string): string;
  encodeURIComponent(component: string): string;
  google: any;
  sentry?: {
    dsn: string;
  };
}

declare module "*.svg" {
  const content: any;
  export default content;
}
