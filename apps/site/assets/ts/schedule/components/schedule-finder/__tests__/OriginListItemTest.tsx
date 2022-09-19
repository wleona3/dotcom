import { fireEvent, screen } from "@testing-library/react";
import React from "react";
import { renderWithScheduleStoreProvider } from "../../../../__tests__/test-helpers";
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

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => mockDispatch
}));

describe("<OriginListItem />", () => {
  test("shows stop info", () => {
    renderWithScheduleStoreProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />
    );

    expect(screen.getByText(stopWithZone.name)).toBeTruthy();
    expect(
      screen.getByText(`Zone ${stopWithZone.zone}`, { exact: false })
    ).toBeTruthy();
  });

  test("disabled for last stop", () => {
    renderWithScheduleStoreProvider(
      <OriginListItem stop={lastStop} lastStop={lastStop} />
    );

    const btn = screen.getByRole("button");
    expect(btn.classList.contains("disabled")).toBeTruthy();
  });

  test("disabled for closed stop", () => {
    renderWithScheduleStoreProvider(
      <OriginListItem stop={closedStop} lastStop={lastStop} />
    );

    const btn = screen.getByRole("button");
    expect(btn.classList.contains("disabled")).toBeTruthy();
  });

  test("renders checkmark when matching selected origin state", () => {
    const store = createScheduleStore(0);
    renderWithScheduleStoreProvider(
      <OriginListItem stop={stopWithZone} lastStop={lastStop} />,
      store
    );
    expect(screen.queryByText("SVG", { trim: true })).toBeNull();
    store.dispatch({
      type: "CHANGE_SF_ORIGIN",
      payload: { scheduleFinderOrigin: stopWithZone.id }
    });
    expect(screen.getByText("SVG", { trim: true })).toBeTruthy();
  });

  test("changes origin on click", () => {
    renderWithScheduleStoreProvider(
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
    renderWithScheduleStoreProvider(
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
