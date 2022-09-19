/**
 * Helpful abstractions for testing
 */
import React, { PropsWithChildren } from "react";
import { Store } from "redux";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { createScheduleStore } from "../schedule/store/schedule-store";
import { LineDiagramStop } from "../schedule/components/__schedule";
import {
  StopCoordState,
  StopPositionContext
} from "../schedule/components/line-diagram/contexts/StopPositionContext";

/**
 * Wrap a component with the redux provider managing the schedule store state.
 * Optional: pass in an existing store.
 */

export function renderWithScheduleStoreProvider(
  ui: React.ReactElement,
  store?: Store,
  renderOptions?: RenderOptions
): RenderResult {
  const scheduleStore = store ?? createScheduleStore(0);

  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={scheduleStore}>{children}</Provider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

const MockStopPositionProvider = ({
  stops,
  state,
  children
}: PropsWithChildren<{
  stops: LineDiagramStop[];
  state?: StopCoordState;
}>): React.ReactElement => {
  const testState =
    state ??
    (Object.fromEntries(
      stops.map((stop, index) => [stop.route_stop.id, [13, 7 + index * 9]])
    ) as StopCoordState);
  const mockContextValues = {
    stopCoordState: testState,
    resetAllCoordinates: jest.fn().mockImplementation(() => {
      // don't actually try to read DOM element positions in tests
    }),
    stopRefMap: new Map()
  };
  return (
    <StopPositionContext.Provider value={mockContextValues}>
      {children}
    </StopPositionContext.Provider>
  );
};

/**
 * Wrap a component with the context provider managing the stop coordinate state
 * Required: pass in custom stops
 * Optional: pass in mocked state to test against
 *
 * Creates mocked positions for all stops, because the JSDOM environment doesn't support measurements such as element.offsetHeight.
 */
export function mockedRenderWithStopPositionContext(
  ui: React.ReactElement,
  stops: LineDiagramStop[],
  state?: StopCoordState,
  renderOptions?: RenderOptions
): RenderResult {
  return render(
    <MockStopPositionProvider stops={stops} state={state}>
      {ui}
    </MockStopPositionProvider>,
    renderOptions
  );
}
