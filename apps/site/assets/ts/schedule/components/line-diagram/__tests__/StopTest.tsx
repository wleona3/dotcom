import React from "react";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import Stop from "../graphics/Stop";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import { CIRC_RADIUS } from "../graphics/graphic-helpers";

const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];

test("Stop component renders and matches snapshot", () => {
  const { asFragment } = mockedRenderWithStopPositionContext(
    <svg>
      <Stop stop={lineDiagram[0]} />
    </svg>,
    [lineDiagram[0]]
  );

  expect(asFragment()).toMatchSnapshot();
});

test("Stop component shows an SVG circle for the stop", () => {
  const { container } = mockedRenderWithStopPositionContext(
    <svg>
      <Stop stop={lineDiagram[0]} />
    </svg>,
    [lineDiagram[0]]
  );

  const circle = container.getElementsByTagName("circle")[0];
  expect(circle).toBeDefined();
  expect(circle.classList).toContain("line-diagram-svg__stop");
  expect(circle.getAttribute("r")).toEqual(`${CIRC_RADIUS}px`);
  // mocked values
  expect(circle.getAttribute("cx")).toEqual("13px");
  expect(circle.getAttribute("cy")).toEqual("7px");
});
