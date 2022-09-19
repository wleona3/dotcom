import React from "react";
import * as redux from "react-redux";
import { cloneDeep, last } from "lodash";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import {
  BASE_LINE_WIDTH,
  BRANCH_SPACING,
  BRANCH_LINE_WIDTH
} from "../graphics/graphic-helpers";
import Line from "../graphics/Line";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import { StopCoordState } from "../contexts/StopPositionContext";
const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];
const lineDiagramWithBranching = (outwardLineDiagram as unknown) as LineDiagramStop[];

const [from, to] = lineDiagram.slice(0, 2);
const [fromWithBranching, toWithBranching] = lineDiagramWithBranching.slice(
  4,
  6
);
const [testX, testY] = [7, 17];

// mock the redux state
const mockState: StopCoordState = {
  [from.route_stop.id]: [testX, testY],
  [to.route_stop.id]: [testX, testY + 7],
  [fromWithBranching.route_stop.id]: [testX, testY],
  [toWithBranching.route_stop.id]: [testX, testY + 7]
};

describe("Line component", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeAll(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <svg>
        <Line from={from} to={to} />
      </svg>,
      [from, to],
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("shows an SVG line between the stops", () => {
    expect(
      container.querySelector("line.line-diagram-svg__line")
    ).toBeDefined();
  });

  it("standard line has expected props", () => {
    const lineElement = container.querySelector("line.line-diagram-svg__line")!;
    expect(lineElement.getAttribute("strokeWidth")).toEqual(
      `${BASE_LINE_WIDTH}px`
    );
    expect(lineElement.getAttribute("x1")).toEqual(`${BASE_LINE_WIDTH + 1}px`);
    expect(lineElement.getAttribute("x2")).toEqual(`${BASE_LINE_WIDTH + 1}px`);
    expect(lineElement.getAttribute("y1")).toEqual(`${testY}px`);
    expect(lineElement.getAttribute("y2")).toEqual(`${testY + 7}px`);
  });
});

describe("Line component between stops with branches", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeAll(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <svg>
        <Line from={fromWithBranching} to={toWithBranching} />
      </svg>,
      [fromWithBranching, toWithBranching],
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("shows an SVG line between the stops", () => {
    expect(container.querySelector("line.line-diagram-svg__line")).toBeTruthy();
  });

  it("line on branch has expected props", () => {
    const lineElement = container.querySelector("line.line-diagram-svg__line")!;
    expect(lineElement.getAttribute("strokeWidth")).toEqual(
      `${BRANCH_LINE_WIDTH}px`
    );
    expect(lineElement.getAttribute("x1")).toEqual(
      `${BRANCH_SPACING * 2 + BASE_LINE_WIDTH + 1}px`
    );
    expect(lineElement.getAttribute("x2")).toEqual(
      `${BRANCH_SPACING * 2 + BASE_LINE_WIDTH + 1}px`
    );
    expect(lineElement.getAttribute("y1")).toEqual(`${testY}px`);
    expect(lineElement.getAttribute("y2")).toEqual(`${testY + 7}px`);
  });
});

describe("Line component between stops with disruptions", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeAll(() => {
    const fromWithDetour = cloneDeep(from);
    last(fromWithDetour.stop_data)!["has_disruption?"] = true;
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <svg>
        <Line from={fromWithDetour} to={to} />
      </svg>,
      [fromWithDetour, to],
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("shows an SVG line between the stops", () => {
    expect(container.querySelector("line.line-diagram-svg__line")).toBeTruthy();
  });

  it("has expected props, including stroke pattern", () => {
    const lineElement = container.querySelector("line.line-diagram-svg__line")!;
    expect(lineElement.getAttribute("strokeWidth")).toEqual(
      `${BASE_LINE_WIDTH}px`
    );
    expect(lineElement.getAttribute("x1")).toEqual(`${BASE_LINE_WIDTH + 1}px`);
    expect(lineElement.getAttribute("x2")).toEqual(`${BASE_LINE_WIDTH + 1}px`);
    expect(lineElement.getAttribute("y1")).toEqual(`${testY}px`);
    expect(lineElement.getAttribute("y2")).toEqual(`${testY + 7}px`);
    expect(lineElement.getAttribute("stroke")).toContain("url(#shuttle)");
  });
});
