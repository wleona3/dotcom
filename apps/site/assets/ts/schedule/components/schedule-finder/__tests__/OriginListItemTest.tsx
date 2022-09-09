import {
  fireEvent,
  MatcherOptions,
  render,
  screen
} from "@testing-library/react";
import React, { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createScheduleStore } from "../../../store/schedule-store";
import OriginListItem from "../OriginListItem";

const closedStop = {
  name: "Def",
  id: "456",
  is_closed: true,
  zone: null
};
const stopWithZone = {
  name: "SL",
  id: "741",
  is_closed: false,
  zone: "1"
};
const lastStop = {
  name: "Wellington",
  id: "place-welln",
  is_closed: false,
  zone: null
};

// redux store/provider
const store = createScheduleStore(0);

function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
  return <Provider store={store}>{children}</Provider>;
}

function renderWithProvider(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => mockDispatch
}));

describe("<OriginListItem />", () => {
  test("shows stop info", () => {
    renderWithProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />
    );

    expect(screen.getByText(stopWithZone.name)).toBeTruthy();
    expect(
      screen.getByText(`Zone ${stopWithZone.zone}`, { exact: false })
    ).toBeTruthy();
  });

  test("disabled for last stop", () => {
    renderWithProvider(<OriginListItem stop={lastStop} lastStop={lastStop} />);

    const btn = screen.getByRole("button");
    expect(btn.classList.contains("disabled")).toBeTruthy();
  });

  test("disabled for closed stop", () => {
    renderWithProvider(
      <OriginListItem stop={closedStop} lastStop={lastStop} />
    );

    const btn = screen.getByRole("button");
    expect(btn.classList.contains("disabled")).toBeTruthy();
  });

  test("renders checkmark when matching selected origin state", () => {
    renderWithProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />
    );
    expect(screen.queryByText("SVG", { trim: true })).toBeNull();
    store.dispatch({
      type: "CHANGE_SF_ORIGIN",
      payload: { scheduleFinderOrigin: stopWithZone.id }
    });
    expect(screen.getByText("SVG", { trim: true })).toBeTruthy();
  });

  test("changes origin on click", () => {
    renderWithProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />
    );

    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "CHANGE_SF_ORIGIN",
      payload: { scheduleFinderOrigin: stopWithZone.id }
    });
  });

  test("changes origin on Enter keyUp", () => {
    renderWithProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />
    );

    const btn = screen.getByRole("button");
    fireEvent.keyUp(btn, { key: "Enter" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "CHANGE_SF_ORIGIN",
      payload: { scheduleFinderOrigin: stopWithZone.id }
    });
  });
});
