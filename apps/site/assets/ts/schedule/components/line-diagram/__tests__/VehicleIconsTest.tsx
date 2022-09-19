import React from "react";
import {
  LineDiagramVehicle,
  RouteStop,
  LineDiagramStop
} from "../../__schedule";
import VehicleIcons from "../VehicleIcons";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import { StopCoordState } from "../contexts/StopPositionContext";

const mockState: StopCoordState = {
  "test-stop": [12, 80]
};
const stop = { id: "test-stop", name: "Test Stop" } as RouteStop;
const lineDiagramStop: LineDiagramStop = {
  stop_data: [],
  route_stop: stop,
  alerts: []
};
const vehicles = [
  { id: "vehicle-1", status: "in_transit", tooltip: "vehicle 1 tooltip text" },
  { id: "vehicle-2", status: "incoming", tooltip: "vehicle 2 tooltip text" },
  { id: "vehicle-3", status: "stopped", tooltip: "vehicle 3 tooltip text" }
] as LineDiagramVehicle[];

describe("VehicleIcons with no vehicles", () => {
  it("doesn't render", () => {
    const { container } = mockedRenderWithStopPositionContext(
      <VehicleIcons stop={stop} vehicles={null} />,
      [lineDiagramStop],
      mockState
    );

    expect(container.innerHTML).toBeFalsy();
  });
});

describe("VehicleIcons with vehicles", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeAll(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <VehicleIcons stop={stop} vehicles={vehicles} />,
      [lineDiagramStop],
      mockState
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders each vehicle", () => {
    const vehicleNodes = container.querySelectorAll(
      ".m-schedule-diagram__vehicle"
    );
    expect(vehicleNodes).toHaveLength(vehicles.length);
  });

  it.each`
    index | tooltip
    ${0}  | ${"vehicle 1 tooltip text"}
    ${1}  | ${"vehicle 2 tooltip text"}
    ${2}  | ${"vehicle 3 tooltip text"}
  `("positions vehicles according to status $status", ({ index, tooltip }) => {
    const node = container.querySelectorAll(".m-schedule-diagram__vehicle")[
      index
    ];
    expect(node.querySelector("[tooltipText]")?.textContent).toContain(tooltip);
  });

  it.each`
    index | expectedPosition | status
    ${0}  | ${30}            | ${"in_transit"}
    ${1}  | ${55}            | ${"incoming"}
    ${2}  | ${70}            | ${"stopped"}
  `(
    "positions vehicles according to status $status",
    ({ index, expectedPosition }) => {
      const node = container.querySelectorAll<HTMLElement>(
        ".m-schedule-diagram__vehicle"
      )[index];
      const { top } = node.style; // e.g. "30px"
      const top_number = parseInt(top.substring(0, 2)); // e.g. 30
      expect(top_number).toEqual(expectedPosition);
    }
  );
});

it("VehicleIcons includes the vehicle crowding status if available", () => {
  const { container } = mockedRenderWithStopPositionContext(
    <VehicleIcons
      stop={stop}
      vehicles={[
        {
          id: "v1",
          status: "incoming",
          crowding: "some_crowding",
          tooltip: "tooltip text"
        }
      ]}
    />,
    [lineDiagramStop],
    mockState
  );
  const node = container.querySelector(".m-schedule-diagram__vehicle");
  expect(node!.querySelector("[tooltipText]")?.textContent).toContain(
    "Some crowding"
  );
});
