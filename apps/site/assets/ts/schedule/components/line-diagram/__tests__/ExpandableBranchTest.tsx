import React from "react";
import { cloneDeep, merge } from "lodash";
import { RouteType } from "../../../../__v3api";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import ExpandableBranch from "../ExpandableBranch";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import { fireEvent, screen } from "@testing-library/dom";

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

const handleStopClick = () => {};
const liveData = {};
describe("ExpandableBranch", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeEach(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <ExpandableBranch
        stops={lineDiagram}
        handleStopClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagram
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("expands a branch", async () => {
    let moreStops = container.querySelector(
      ".c-expandable-block__panel .m-schedule-diagram__stop"
    );
    expect(moreStops).toBeFalsy();
    fireEvent.click(await screen.findByRole("button"));
    expect(moreStops).toBeTruthy();
  });
});
