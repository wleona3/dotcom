import React from "react";
import { screen } from "@testing-library/dom";
import { cloneDeep, merge } from "lodash";
import { RouteType } from "../../../../__v3api";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import StopListWithBranches from "../StopListWithBranches";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";

const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];
let lineDiagramBranchingOut = (outwardLineDiagram as unknown) as LineDiagramStop[];

const route = {
  type: 2 as RouteType,
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

test("StopListWithBranches renders and matches snapshot", () => {
  const { asFragment } = mockedRenderWithStopPositionContext(
    <StopListWithBranches
      stops={lineDiagramBranchingIn}
      handleStopClick={handleStopClick}
      liveData={liveData}
    />,
    lineDiagramBranchingIn
  );

  expect(asFragment()).toMatchSnapshot();
});
describe("StopListWithBranches", () => {
  let container: HTMLElement;
  beforeEach(() => {
    ({ container } = mockedRenderWithStopPositionContext(
      <StopListWithBranches
        stops={lineDiagramBranchingIn}
        handleStopClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagramBranchingIn
    ));
  });

  it("renders expandable branches as well as individual stops", () => {
    expect(
      container.querySelectorAll(".m-schedule-diagram__expander")
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".m-schedule-diagram__stop")
    ).toHaveLength(10);
  });

  it("renders short branches as expanded", () => {
    const branches = screen.queryAllByTestId("branch");
    expect(branches).toHaveLength(2);
    const shortBranch = branches[0];
    const longBranch = branches[1];
    expect(
      longBranch.querySelector(".m-schedule-diagram__expander")
    ).toBeDefined();
    expect(
      shortBranch.querySelector(".m-schedule-diagram__expander")
    ).toBeNull();
  });

  describe("where branching inward", () => {
    it.each`
      index | expectedBranchNaming
      ${0}  | ${"Destination Line"}
      ${1}  | ${null}
      ${2}  | ${null}
      ${3}  | ${null}
      ${4}  | ${"Twig Destination Line"}
      ${5}  | ${null}
      ${6}  | ${"Branch Destination Line"}
      ${7}  | ${null}
      ${8}  | ${null}
    `(
      "shows branch name $expectedBranchNaming at stop $index",
      ({ index, expectedBranchNaming }) => {
        const branchNameNode = container
          .querySelectorAll(".m-schedule-diagram__stop")
          [index].querySelector(".u-small-caps")!;

        if (expectedBranchNaming) {
          expect(branchNameNode.textContent).toEqual(expectedBranchNaming);
        } else {
          expect(branchNameNode).toBeNull();
        }
      }
    );
  });
});
