import React from "react";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import Merges from "../graphics/Merge";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];
const lineDiagramWithBranching = (outwardLineDiagram as unknown) as LineDiagramStop[];

// mock the redux state so that snapshot has positioned stops
const mockState = [...lineDiagram, ...lineDiagramWithBranching].reduce(
  (acc, stop, index) => ({
    ...acc,
    [stop.route_stop.id]: [10, index * 20 + 30]
  }),
  {}
);

describe("Merge component", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeAll(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <svg>
        <Merges lineDiagram={lineDiagramWithBranching} />
      </svg>,
      lineDiagramWithBranching,
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("shows an SVG group for the merge point", () => {
    expect(container.querySelector("g.line-diagram-svg__merge")).toBeTruthy();
    expect(
      container.querySelector(
        "g.line-diagram-svg__merge line.line-diagram-svg__line"
      )
    ).toBeTruthy();
    expect(
      container.querySelector("g.line-diagram-svg__merge path")
    ).toBeTruthy();
  });

  it("shows nothing when there are no branches", () => {
    const {
      container: containerNoBranches
    } = mockedRenderWithStopPositionContext(
      <svg>
        <Merges lineDiagram={lineDiagram} />
      </svg>,
      lineDiagram,
      mockState
    );

    expect(
      containerNoBranches.querySelector("g.line-diagram-svg__merge")
    ).not.toBeTruthy();
    expect(
      containerNoBranches.querySelector(
        "g.line-diagram-svg__merge line.line-diagram-svg__line"
      )
    ).not.toBeTruthy();
    expect(
      containerNoBranches.querySelector("g.line-diagram-svg__merge path")
    ).not.toBeTruthy();
  });
});
