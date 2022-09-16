import React from "react";
import { AnyAction, Store } from "redux";
import * as swr from "swr";
import { cloneDeep, merge } from "lodash";
import LineDiagramAndStopListPage from "../LineDiagram";
import { EnhancedRoute, RouteType } from "../../../../__v3api";
import { LineDiagramStop, SimpleStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import simpleLiveData from "./lineDiagramData/live-data.json";
import { fireEvent, screen } from "@testing-library/react";
import { createScheduleStore } from "../../../store/schedule-store";
import { renderWithScheduleStoreProvider } from "../../../../__tests__/util";

const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];
let lineDiagramBranchingOut = (outwardLineDiagram as unknown) as LineDiagramStop[];

// Mock useSWR to return fixture data
jest.mock("swr", () => {
  return jest.fn(() => ({ data: simpleLiveData }));
});

const route = {
  type: 3 as RouteType,
  name: "route 1",
  long_name: "route 1 long name",
  color: "F00B42",
  id: "route-1",
  direction_names: {
    0: "Outbound",
    1: "Inbound"
  },
  direction_destinations: {
    0: "Begin",
    1: "End"
  },
  description: "key_bus_route",
  "custom_route?": false,
  header: "",
  alerts: []
};

lineDiagram.forEach(({ route_stop }) => {
  route_stop.route = cloneDeep(route);
});

lineDiagramBranchingOut.forEach(({ route_stop }) => {
  route_stop.route = cloneDeep(route);
});

let lineDiagramBranchingIn = cloneDeep(lineDiagramBranchingOut).reverse();
const CRroute = merge(cloneDeep(route), { type: 2 as RouteType });
lineDiagramBranchingIn.forEach(({ route_stop }) => {
  route_stop.route = CRroute;
  if (route_stop["is_terminus?"]) {
    route_stop["is_beginning?"] = !route_stop["is_beginning?"];
  }
});

const stops = lineDiagram.map(({ route_stop }) => ({
  name: route_stop.name,
  id: route_stop.id,
  is_closed: false,
  zone: route_stop.zone || null
})) as SimpleStop[];

const directionId = 1;

test("LineDiagram renders and matches snapshot", () => {
  let { asFragment } = renderWithScheduleStoreProvider(
    <LineDiagramAndStopListPage
      lineDiagram={lineDiagram}
      route={route as EnhancedRoute}
      directionId={directionId}
    />
  );
  expect(asFragment()).toMatchSnapshot();
});

describe("LineDiagram", () => {
  let store: Store<any, AnyAction>;
  beforeEach(() => {
    store = createScheduleStore(0);
    renderWithScheduleStoreProvider(
      <LineDiagramAndStopListPage
        lineDiagram={lineDiagram}
        route={route as EnhancedRoute}
        directionId={directionId}
      />
    ),
      store;
  });

  test("includes buttons to open the Schedule Finder modal", () => {
    const { modalOpen: initialModalOpen } = store.getState();
    expect(initialModalOpen).toBe(false);
    const openBtn = screen.getAllByText("View schedule", { exact: false })[0];
    fireEvent.click(openBtn);
    const { modalOpen } = store.getState();
    expect(modalOpen).toBe(true);
  });

  test("can search and filter stops", () => {
    expect(document.querySelector(".m-schedule-diagram--searched")).toBeFalsy();
    const searchInput = screen.getByPlaceholderText("Search for a stop");
    fireEvent.change(searchInput, { target: { value: "S" } });
    expect(
      document.querySelector(".m-schedule-diagram--searched")
    ).toBeTruthy();
    expect(document.querySelector("b.u-highlight")).toBeTruthy();
    expect(document.querySelector("b.u-highlight")!.textContent).toEqual("S");

    fireEvent.change(searchInput, { target: { value: "Impossible" } });
    expect(
      screen.queryByText(
        "Try changing your direction or adjusting your search.",
        { exact: false }
      )
    ).toBeTruthy();
  });
});

test.each`
  type | name
  ${0} | ${"Stations"}
  ${1} | ${"Stations"}
  ${2} | ${"Stations"}
  ${3} | ${"Stops"}
  ${4} | ${"Stops"}
`(
  "LineDiagram names stops or stations for route type $type",
  ({ type, name }) => {
    renderWithScheduleStoreProvider(
      <LineDiagramAndStopListPage
        lineDiagram={lineDiagram}
        route={
          {
            ...route,
            type: type as RouteType
          } as EnhancedRoute
        }
        directionId={directionId}
      />
    );
    const heading = screen.getByText(name, { exact: false, selector: "h3" });
    expect(heading).toBeTruthy();
  }
);

test.each`
  type | willPoll
  ${0} | ${true}
  ${1} | ${true}
  ${2} | ${true}
  ${3} | ${true}
  ${4} | ${false}
`(
  "LineDiagram requests live data for most route types: $type",
  ({ type, willPoll }) => {
    // don't mock the return value here,
    // we just want to check if it's called
    const useSWRSpy = jest.spyOn(swr, "default");
    renderWithScheduleStoreProvider(
      <LineDiagramAndStopListPage
        lineDiagram={lineDiagram}
        route={
          {
            ...route,
            type: type as RouteType
          } as EnhancedRoute
        }
        directionId={directionId}
      />
    );
    expect(useSWRSpy).toHaveBeenCalled();

    if (willPoll) {
      expect(useSWRSpy).toHaveBeenCalledWith(
        "/schedules/line_api/realtime?id=route-1&direction_id=1",
        expect.any(Function),
        expect.objectContaining({ refreshInterval: expect.any(Number) })
      );
    } else {
      // will not ping the realtime endpoint
      expect(useSWRSpy).toHaveBeenCalledWith(
        null,
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: expect.any(Number)
        })
      );
    }
  }
);
