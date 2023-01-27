import { createElement } from "react";
import { Container, hydrate } from "react-dom";

/**
 * See apps/site/assets/react_app.js for list of React components we currently
 * use with server rendering. Import them here and also add them to the
 * SUPPORTED_COMPONENTS object.
 */
import StopPage from "../stop/components/StopPage";

const SUPPORTED_COMPONENTS = {
  StopPage
};

declare global {
  interface Window {
    hydrateReactComponent: typeof hydrateReactComponent;
  }
}

type Props = Record<string, unknown>;

function hydrateReactComponent(
  componentName: keyof typeof SUPPORTED_COMPONENTS,
  componentProps: Props,
  container: Container
): void {
  if (Object.keys(SUPPORTED_COMPONENTS).includes(componentName)) {
    const component = SUPPORTED_COMPONENTS[componentName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hydrate(createElement(component, componentProps as any), container);
  }
}

window.hydrateReactComponent = hydrateReactComponent;
const event = new Event("hydratorloaded");
document.dispatchEvent(event);
