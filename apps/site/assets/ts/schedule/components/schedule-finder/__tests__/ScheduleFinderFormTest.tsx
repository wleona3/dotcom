import React from "react";
import * as redux from "react-redux";
import { Route } from "../../../../__v3api";
import { SimpleStopMap } from "../../__schedule";
import ScheduleFinderForm from "../ScheduleFinderForm";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithScheduleStoreProvider } from "../../../../__tests__/test-helpers";

const route: Route = {
  description: "",
  direction_destinations: { 0: "Oak Grove", 1: "Forest Hills" },
  direction_names: { 0: "Inbound", 1: "Outbound" },
  id: "Orange",
  long_name: "Orange Line",
  name: "Orange",
  type: 1
};

const oneDirectionRoute: Route = {
  description: "",
  direction_destinations: { 0: "Destination", 1: null },
  direction_names: { 0: "Outbound", 1: null },
  id: "route",
  long_name: "the route",
  name: "Route",
  type: 1
};

const stops: SimpleStopMap = {
  "1": [
    {
      name: "SL",
      id: "741",
      is_closed: false,
      zone: "1"
    },
    {
      name: "Abc",
      id: "123",
      is_closed: false,
      zone: null
    },
    {
      name: "Def",
      id: "456",
      is_closed: false,
      zone: null
    },
    {
      name: "Wellington",
      id: "place-welln",
      is_closed: true,
      zone: null
    }
  ],
  "0": [
    {
      name: "Wellington",
      id: "place-welln",
      is_closed: true,
      zone: null
    },
    {
      name: "Abc",
      id: "123",
      is_closed: false,
      zone: null
    },
    {
      name: "SL",
      id: "741",
      is_closed: false,
      zone: "1"
    }
  ]
};

test("<ScheduleFinderForm /> includes only valid directions in the direction picker", () => {
  const { container } = renderWithScheduleStoreProvider(
    <ScheduleFinderForm route={oneDirectionRoute} stopsByDirection={stops} />
  );

  const directions = screen.getByLabelText("Choose a direction", {
    exact: false
  });
  expect(within(directions).queryByText(/INBOUND/)).toBeNull();
  expect(within(directions).getByText(/OUTBOUND/)).toBeTruthy();
});

describe("<ScheduleFinderForm />", () => {
  const submitted = jest.fn();
  beforeEach(() => {
    renderWithScheduleStoreProvider(
      <ScheduleFinderForm
        onSubmit={submitted}
        route={route}
        stopsByDirection={stops}
      />
    );
  });

  test("shows an error if the form is submitted without an origin", () => {
    expect(screen.queryByText("Please provide an origin")).toBeNull();

    fireEvent(
      screen.getByText("Get schedules"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );

    expect(screen.getByText("Please provide an origin")).toBeTruthy();
  });

  test("calls the submit handler and clears the error", () => {
    fireEvent(
      screen.getByText("Get schedules"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );
    expect(screen.getByText("Please provide an origin")).toBeTruthy();

    const originSelect = screen.getByLabelText("Choose an origin stop", {
      exact: false
    });

    fireEvent.change(originSelect, { target: { value: "123" } });

    fireEvent(
      screen.getByText("Get schedules"),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );

    expect(screen.queryByText("Please provide an origin")).toBeNull();
    expect(submitted).toHaveBeenCalledTimes(1);
  });
});

test("<ScheduleFinderForm /> calls the direction and origin change handlers", () => {
  const useDispatchSpy = jest.spyOn(redux, "useDispatch");
  const mockDispatchFn = jest.fn();
  useDispatchSpy.mockReturnValue(mockDispatchFn);

  renderWithScheduleStoreProvider(
    <ScheduleFinderForm route={route} stopsByDirection={stops} />
  );

  const directionSelect = screen.getByLabelText("Choose a direction", {
    exact: false
  });
  const originSelect = screen.getByLabelText("Choose an origin stop", {
    exact: false
  });
  fireEvent.change(directionSelect, { target: { value: "1" } });
  expect(mockDispatchFn).toHaveBeenLastCalledWith({
    payload: { scheduleFinderDirection: 1 },
    type: "CHANGE_SF_DIRECTION"
  });
  fireEvent.change(originSelect, { target: { value: "123" } });
  expect(mockDispatchFn).toHaveBeenLastCalledWith({
    payload: { scheduleFinderOrigin: "123" },
    type: "CHANGE_SF_ORIGIN"
  });
});
