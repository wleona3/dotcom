/**
 * Helpful abstractions for testing
 */
import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createScheduleStore } from "./../schedule/store/schedule-store";
import { AnyAction, Store } from "redux";

/**
 * Wrap a component with the redux provider managing the schedule store state.
 * Optional: pass in an existing store.
 */

export function renderWithScheduleStoreProvider(
  ui: React.ReactElement,
  store?: Store<any, AnyAction>,
  renderOptions?: RenderOptions
) {
  const scheduleStore = store ?? createScheduleStore(0);

  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={scheduleStore}>{children}</Provider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
