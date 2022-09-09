import React, { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import {
  closeRoutePatternMenuAction,
  menuReducer as reducer,
  showAllRoutePatternsAction,
  State
} from "../direction/reducer";
import ScheduleDirection, {
  fetchMapData,
  fetchLineData
} from "../ScheduleDirection";
import { EnhancedRoute } from "../../../__v3api";
import { MapData, StaticMapData } from "../../../leaflet/components/__mapdata";
import {
  ShapesById,
  LineDiagramStop,
  RoutePatternsByDirection
} from "../__schedule";
import lineDiagramData from "./test-data/lineDiagramData.json"; // Not a full line diagram
import * as routePatternsByDirectionData from "./test-data/routePatternsByDirectionData.json";
import { createScheduleStore } from "../../store/schedule-store";

const body =
  '<div id="body-wrapper"><div id="react-root"></div><div id="map-root"></div></div>';

const lineDiagram = lineDiagramData as LineDiagramStop[];

const stops = lineDiagram.map(({ route_stop }) => ({
  name: route_stop.name,
  id: route_stop.id,
  is_closed: false,
  zone: route_stop.zone || null
}));

const route = {
  type: 3,
  name: "route 1",
  long_name: "route 1 long name",
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
} as EnhancedRoute;

const oneDirectionRoute = {
  type: 3,
  name: "route 2",
  long_name: "route 2 long name",
  id: "route-2",
  direction_names: {
    0: null,
    1: "Inbound"
  },
  direction_destinations: {
    0: null,
    1: "End"
  },
  description: "key_bus_route",
  "custom_route?": false,
  header: "",
  alerts: []
} as EnhancedRoute;

const directionId = 1;
const routePatternsByDirection = routePatternsByDirectionData as RoutePatternsByDirection;

const shapesById = {
  "shape-1": {
    stop_ids: ["stop"],
    priority: 3,
    polyline: "xyz",
    name: "Shape 1",
    id: "shape-1",
    direction_id: 0
  },
  "shape-2": {
    stop_ids: ["stop"],
    priority: 3,
    polyline: "xyz",
    name: "Shape 2",
    id: "shape-2",
    direction_id: 1
  },
  "shape-3": {
    stop_ids: ["stop"],
    priority: 3,
    polyline: "xyz",
    name: "Shape 3",
    id: "shape-3",
    direction_id: 0
  }
} as ShapesById;

const state = {
  routePattern: routePatternsByDirection["0"][0],
  shape: shapesById["shape-1"],
  directionId: 0,
  shapesById: shapesById,
  routePatternsByDirection: routePatternsByDirection,
  routePatternMenuOpen: false,
  routePatternMenuAll: false,
  itemFocus: null
} as State;

/* eslint-disable camelcase */
const mapData: MapData = {
  zoom: 16,
  width: 600,
  tile_server_url: "https://mbta-map-tiles-dev.s3.amazonaws.com",
  polylines: [],
  markers: [
    {
      icon: "vehicle-bordered-expanded",
      id: "vehicle-R-545CDFC5",
      latitude: 42.39786911010742,
      longitude: -71.13092041015625,
      rotation_angle: 90,
      tooltip_text: "Alewife train is on the way to Alewife",
      tooltip: null
    },
    {
      icon: "stop-circle-bordered-expanded",
      id: "stop-place-alfcl",
      latitude: 42.395428,
      longitude: -71.142483,
      rotation_angle: 0,
      tooltip: null,
      tooltip_text: "Alewife"
    }
  ],
  stop_markers: [
    {
      icon: "stop-circle-bordered-expanded",
      id: "stop-place-alfcl",
      latitude: 42.395428,
      longitude: -71.142483,
      rotation_angle: 0,
      tooltip: null,
      tooltip_text: "Alewife"
    }
  ],
  height: 600,
  default_center: {
    longitude: -71.05891,
    latitude: 42.360718
  }
};

const staticMapData: StaticMapData = {
  img_src: "http://example.com/map.png",
  pdf_url: "http://example.com/map.pdf"
};
/* eslint-enable camelcase */

const getComponent = () => (
  <ScheduleDirection
    route={route}
    directionId={directionId}
    routePatternsByDirection={routePatternsByDirection}
    mapData={mapData}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId={null}
  />
);

const getSingleDirectionComponent = () => (
  <ScheduleDirection
    route={oneDirectionRoute}
    directionId={directionId}
    routePatternsByDirection={routePatternsByDirection}
    mapData={mapData}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId={null}
  />
);

const getSubwayComponent = () => (
  <ScheduleDirection
    mapData={mapData}
    route={{ ...route, type: 1 }}
    directionId={directionId}
    routePatternsByDirection={routePatternsByDirection}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId={null}
  />
);

const getCRComponent = () => (
  <ScheduleDirection
    route={{ ...route, type: 2 }}
    directionId={directionId}
    routePatternsByDirection={routePatternsByDirection}
    mapData={mapData}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId={null}
  />
);

const getStaticMapComponent = () => (
  <ScheduleDirection
    staticMapData={staticMapData}
    route={{ ...route, type: 4 }}
    directionId={directionId}
    routePatternsByDirection={routePatternsByDirection}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId={null}
  />
);

const getGreenLineComponent = () => {
  const greenRoute: EnhancedRoute = {
    type: 0,
    name: "Green Line",
    long_name: "Green Line",
    id: "Green",
    direction_names: { "0": "Westbound", "1": "Eastbound" },
    direction_destinations: {
      "0": "Boston College / Cleveland Circle / Riverside / Heath Street",
      "1": "Park Street / Government Center / North Station / Lechmere"
    },
    description: "rapid_transit",
    header: "",
    alerts: []
  };

  return (
    <ScheduleDirection
      mapData={mapData}
      route={greenRoute}
      directionId={directionId}
      routePatternsByDirection={routePatternsByDirection}
      lineDiagram={lineDiagram}
      services={[]}
      stops={{ stops }}
      today="2019-12-05"
      scheduleNote={null}
      busVariantId={null}
    />
  );
};

const getVariantComponent = () => (
  <ScheduleDirection
    route={route}
    directionId={0}
    routePatternsByDirection={routePatternsByDirection}
    mapData={mapData}
    lineDiagram={lineDiagram}
    services={[]}
    stops={{ stops }}
    today="2019-12-05"
    scheduleNote={null}
    busVariantId="pattern-3"
  />
);
const store = createScheduleStore(0);
// redux store/provider
function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
  return <Provider store={store}>{children}</Provider>;
}
function renderWithProvider(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

afterEach(cleanup);

test("<ScheduleDirection /> renders a bus component", () => {
  const { asFragment } = renderWithProvider(getComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> renders a subway component", () => {
  const { asFragment } = renderWithProvider(getSubwayComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> renders a CR component", () => {
  const { asFragment } = renderWithProvider(getCRComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> can render green line", () => {
  const { asFragment } = renderWithProvider(getGreenLineComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> respects the initially selected pattern ID, if specified", () => {
  const { asFragment } = renderWithProvider(getVariantComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> renders with a static map", () => {
  const { asFragment } = renderWithProvider(getStaticMapComponent());
  expect(asFragment()).toMatchSnapshot();
});

test("<ScheduleDirection /> not allow changing direction when no route patterns", () => {
  const { container, asFragment } = renderWithProvider(
    getSingleDirectionComponent()
  );
  expect(asFragment()).toMatchSnapshot();
  expect(container.querySelector(".m-schedule-direction__button")).toBeNull();
});

test("<ScheduleDirection /> can change direction", () => {
  window.history.replaceState = jest.fn();
  renderWithProvider(getComponent());
  expect(screen.queryByText("Inbound", { exact: false })).toBeTruthy();
  expect(screen.queryByText("Outbound", { exact: false })).toBeFalsy();
  fireEvent.click(screen.getByText("Change Direction", { exact: false }));

  expect(screen.queryByText("Inbound", { exact: false })).toBeFalsy();
  expect(screen.queryByText("Outbound", { exact: false })).toBeTruthy();
  expect(window.history.replaceState).toBeCalledWith(
    {},
    "",
    "/?schedule_direction%5Bdirection_id%5D=0&schedule_direction%5Bvariant%5D=pattern-1"
  );
});

test("<ScheduleDirection /> can change route pattern", () => {
  window.history.replaceState = jest.fn();
  renderWithProvider(getComponent());
  fireEvent.click(screen.getByText("Change Direction", { exact: false })); // shows clickable route pattern options

  fireEvent.click(screen.getByRole("button", { name: "Pattern 1" }));
  expect(window.history.replaceState).toBeCalledWith(
    {},
    "",
    "/?schedule_direction%5Bdirection_id%5D=0&schedule_direction%5Bvariant%5D=pattern-1"
  );

  fireEvent.click(
    screen.getByRole("menuitem", {
      name: "Pattern 3 from Pattern 3, typical route"
    })
  );
  expect(window.history.replaceState).toBeCalledWith(
    {},
    "",
    "/?schedule_direction%5Bdirection_id%5D=0&schedule_direction%5Bvariant%5D=pattern-3"
  );

  // coverage
  fireEvent.click(screen.getByRole("button", { name: "Pattern 3" }));
  fireEvent.keyDown(
    screen.getByRole("menuitem", { name: "Pattern 1 typical route" }),
    { key: "ArrowRight" }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", {
      name: "Pattern 3 from Pattern 3, typical route"
    }),
    { key: "ArrowRight" }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", { name: "click for additional routes" }),
    { key: "ArrowRight" }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", { name: "Pattern 1 typical route" }),
    { key: "ArrowLeft" }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", {
      name: "Pattern 3 from Pattern 3, typical route"
    }),
    { key: "ArrowLeft" }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", {
      name: "Pattern 3 from Pattern 3, typical route"
    }),
    { key: "Tab", shiftKey: true }
  );
  fireEvent.keyDown(
    screen.getByRole("menuitem", {
      name: "Pattern 3 from Pattern 3, typical route"
    }),
    { key: "X" }
  );
  fireEvent.click(
    screen.getByRole("menuitem", { name: "click for additional routes" })
  );
});

// we need to save the original object for later to not affect tests from other files
const realLocation = global.location;

beforeAll(() => {
  const location = {
    ...window.location,
    assign: jest.fn()
  };
  Object.defineProperty(window, "location", {
    writable: true,
    value: location
  });
});

afterAll(() => {
  global.location = realLocation;
});

test("<ScheduleDirection /> can change route for green line", () => {
  const { container } = renderWithProvider(getGreenLineComponent());
  const btn = container.querySelector(
    ".m-schedule-direction__route-pattern--clickable"
  )!;
  fireEvent.click(btn);
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.click(btn);
  expect(screen.queryByRole("menu")).toBeFalsy();
  fireEvent.click(btn);

  fireEvent.click(screen.getByRole("menuitem", { name: "Green Line C" }));
  expect(window.location.assign).toHaveBeenCalledWith(
    "/schedules/Green-C?direction_id=1"
  );
  fireEvent.keyUp(screen.getByRole("menuitem", { name: "Green Line D" }), {
    key: "Enter"
  });
  expect(window.location.assign).toHaveBeenCalledWith(
    "/schedules/Green-D?direction_id=1"
  );
});

it("reducer can change state correctly for closeRoutePatternMenu", () => {
  const previousState = { ...state, routePatternMenuOpen: true } as State;
  const nextState = reducer(previousState, closeRoutePatternMenuAction());
  expect(nextState.routePatternMenuOpen).toEqual(false);
});

it("reducer can change state correctly for showAllRoutePatterns", () => {
  const previousState = { ...state, routePatternMenuAll: false } as State;
  const nextState = reducer(previousState, showAllRoutePatternsAction());
  expect(nextState.routePatternMenuAll).toEqual(true);
});

describe("fetchMapData", () => {
  it("fetches data", () => {
    const spy = jest.fn();
    window.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve: Function) =>
          resolve({
            json: () => mapData,
            ok: true,
            status: 200,
            statusText: "OK"
          })
        )
    );

    return fetchMapData("1", 0, "2", spy).then(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        "/schedules/map_api?id=1&direction_id=0&shape_id=2"
      );
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_STARTED"
      });
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_COMPLETE",
        payload: mapData
      });
    });
  });

  it("fails gracefully if fetch is unsuccessful", () => {
    const spy = jest.fn();
    window.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve: Function) =>
          resolve({
            json: () => "Internal Server Error",
            ok: false,
            status: 500,
            statusText: "INTERNAL SERVER ERROR"
          })
        )
    );

    return fetchMapData("1", 0, "2", spy).then(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        "/schedules/map_api?id=1&direction_id=0&shape_id=2"
      );
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_STARTED"
      });
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_ERROR"
      });
    });
  });
});

describe("fetchLineData", () => {
  it("fetches data", () => {
    const spy = jest.fn();
    window.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve: Function) =>
          resolve({
            json: () => lineDiagramData,
            ok: true,
            status: 200,
            statusText: "OK"
          })
        )
    );

    return fetchLineData("Orange", 1, "1", spy).then(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        "/schedules/line_api?id=Orange&direction_id=1&route_pattern=1"
      );
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_STARTED"
      });
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_COMPLETE",
        payload: lineDiagramData
      });
    });
  });

  it("fails gracefully if fetch is unsuccessful", () => {
    const spy = jest.fn();
    window.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve: Function) =>
          resolve({
            json: () => "Internal Server Error",
            ok: false,
            status: 500,
            statusText: "INTERNAL SERVER ERROR"
          })
        )
    );

    return fetchLineData("Red", 0, "1", spy).then(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        "/schedules/line_api?id=Red&direction_id=0&route_pattern=1"
      );
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_STARTED"
      });
      expect(spy).toHaveBeenCalledWith({
        type: "FETCH_ERROR"
      });
    });
  });
});
