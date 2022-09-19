import React from "react";
import { cloneDeep, merge } from "lodash";
import { RouteType } from "../../../../__v3api";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import Diagram from "../graphics/Diagram";
import { LiveDataByStop } from "../__line-diagram";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";

const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];
let lineDiagramBranchingOut = (outwardLineDiagram as unknown) as LineDiagramStop[];

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

const liveData = {};

// mock the redux state
const mockState = [...lineDiagram, ...lineDiagramBranchingOut].reduce(
  (acc, stop, index) => ({
    ...acc,
    [stop.route_stop.id]: [10, index * 20 + 30]
  }),
  {}
);

test("<Diagram /> filters out incoming <VehicleIcons /> at first stop", () => {
  const liveDataVehiclesArrivingToOrigin: LiveDataByStop = {
    "line-origin": {
      headsigns: [],
      vehicles: [
        {
          id: "veh0",
          status: "stopped",
          crowding: null,
          tooltip: "tooltip for stopped vehicle at stop 1"
        },
        {
          id: "veh1",
          status: "incoming",
          crowding: null,
          tooltip: "tooltip for vehicle 1 incoming to stop 1"
        },
        {
          id: "veh2",
          status: "in_transit",
          crowding: null,
          tooltip: "tooltip for vehicle 2 in_transit at stop 1"
        }
      ]
    }
  };
  const { container } = mockedRenderWithStopPositionContext(
    <Diagram
      lineDiagram={lineDiagram}
      liveData={liveDataVehiclesArrivingToOrigin}
    />,
    lineDiagram,
    mockState
  );
  const vehicleIconElements = container.querySelectorAll(
    ".m-schedule-diagram__vehicle"
  );
  expect(vehicleIconElements).toHaveLength(1);
  const iconHtml = vehicleIconElements[0].innerHTML;
  expect(iconHtml).toContain("tooltip for stopped vehicle at stop 1");
  expect(iconHtml).not.toContain("tooltip for vehicle 1 incoming to stop 1");
  expect(iconHtml).not.toContain("tooltip for vehicle 2 in_transit at stop 1");
});

describe.each`
  source                     | situation                        | css
  ${lineDiagram}             | ${"for simple lines"}            | ${"bus"}
  ${lineDiagramBranchingOut} | ${"with branches going outward"} | ${"bus"}
  ${lineDiagramBranchingIn}  | ${"with branches going inward"}  | ${"commuter-rail"}
`("Diagram $situation", ({ source, css }) => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeEach(() => {
    mockedRenderWithStopPositionContext(
      <Diagram lineDiagram={source} liveData={liveData} />,
      source,
      mockState
    );
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("uses the route color CSS class", () => {
    expect(container.querySelector(`.line-diagram-svg.${css}`)).toBeTruthy();
  });

  it("shows an SVG", () => {
    expect(container.querySelector("svg.line-diagram-svg")).toBeTruthy();
    expect(container.querySelector("line.line-diagram-svg__line")).toBeTruthy();
    expect(
      container.querySelector("circle.line-diagram-svg__stop")
    ).toBeTruthy();
    expect(
      container.querySelectorAll("circle.line-diagram-svg__stop")
    ).toHaveLength(source.length);
  });

  it("shows no merge if no branches", () => {
    if (source === lineDiagram) {
      // no branches expected
      expect(container.querySelector("g.line-diagram-svg__merge")).toBeFalsy();
      expect(
        container.querySelector("g.line-diagram-svg__merge path")
      ).toBeFalsy();
    } else {
      // has branches
      expect(container.querySelector("g.line-diagram-svg__merge")).toBeTruthy();
      expect(
        container.querySelector("g.line-diagram-svg__merge path")
      ).toBeTruthy();
    }
  });
});
