import React from "react";
import { cloneDeep, merge } from "lodash";
import { RouteType } from "../../../../__v3api";
import { LineDiagramStop, CrowdingType } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import LineDiagramWithStops from "../LineDiagramWithStops";
import * as simpleLiveData from "./lineDiagramData/live-data.json";
import { LiveDataByStop } from "../__line-diagram";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import { screen } from "@testing-library/dom";
import * as StopPositionContext from "../contexts/StopPositionContext";

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
const liveData = (simpleLiveData as unknown) as LiveDataByStop;
const liveDataWithCrowding = (cloneDeep(
  simpleLiveData
) as unknown) as LiveDataByStop;
(liveDataWithCrowding["line-stop2"].headsigns[0].time_data_with_crowding_list[0]
  .crowding as CrowdingType) = "not_crowded";

// mock the redux state so that snapshot has positioned stops
const mockState = lineDiagram.reduce(
  (acc, stop, index) => ({
    ...acc,
    [stop.route_stop.id]: [10, index * 20 + 30]
  }),
  {}
);

const spy = jest.spyOn(StopPositionContext, "useStopPositionReset");

describe("LineDiagramWithStops", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeEach(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <LineDiagramWithStops
        stops={lineDiagram}
        handleStopClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagram,
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("uses the useStopPositionReset hook", () => {
    expect(spy).toHaveBeenCalled();
  });

  it("shows <StopListWithBranches /> if the line has branches", () => {
    expect(screen.getByTestId("branch")).toHaveLength(0);
    mockedRenderWithStopPositionContext(
      <LineDiagramWithStops
        stops={lineDiagramBranchingOut}
        handleStopClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagramBranchingOut,
      mockState
    );
    expect(screen.getByTestId("branch")).toHaveLength(1);
  });

  it("toggles u-no-crowding-data class if crowding present", () => {
    expect(container.querySelector(".u-no-crowding-data")).toBeTruthy();
    const {
      container: containerWithCrowding
    } = mockedRenderWithStopPositionContext(
      <LineDiagramWithStops
        stops={lineDiagram}
        handleStopClick={handleStopClick}
        liveData={liveDataWithCrowding}
      />,
      lineDiagram,
      mockState
    );
    expect(
      containerWithCrowding.querySelector(".u-no-crowding-data")
    ).toBeFalsy();
  });
});
