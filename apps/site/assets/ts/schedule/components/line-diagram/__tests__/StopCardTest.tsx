import React from "react";
import { cloneDeep, merge } from "lodash";
import {
  RouteType,
  HeadsignWithCrowding,
  Schedule,
  Prediction
} from "../../../../__v3api";
import { LineDiagramStop } from "../../__schedule";
import simpleLineDiagram from "./lineDiagramData/simple.json"; // not a full line diagram
import outwardLineDiagram from "./lineDiagramData/outward.json"; // not a full line diagram
import StopCard from "../StopCard";
import { TripPrediction } from "../../__trips";
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

const handleStopClick = () => {};
const liveData = { headsigns: [], vehicles: [] };

describe("StopCard", () => {
  let asFragment: () => DocumentFragment, container: HTMLElement;
  beforeEach(() => {
    ({ asFragment, container } = mockedRenderWithStopPositionContext(
      <StopCard
        stop={lineDiagram[0]}
        onClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagram
    ));
  });

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  it("includes a button to open Schedule Finder on each stop", () => {
    expect(
      container.querySelector(".m-schedule-diagram__footer > button")
    ).toBeTruthy();
    expect(
      container.querySelector(".m-schedule-diagram__footer > button")
        ?.textContent
    ).toContain("View schedule");
  });

  it("has a tooltip for a transit connection", () => {
    const stopConnections = container.querySelectorAll<HTMLElement>(
      ".m-schedule-diagram__connections a"
    );
    stopConnections.forEach(connectionLink => {
      expect(connectionLink.dataset.toggle).toEqual("tooltip");
      expect(connectionLink.dataset.originalTitle).toContain("Route");
    });
  });

  it("indicates detours, stop closures, etc", () => {
    expect(container.querySelector(".m-schedule-diagram__alert")).toBeTruthy();
    expect(
      container.querySelector(".m-schedule-diagram__alert")?.textContent
    ).toContain("Detour");
  });
});

const predictionHeadsign: HeadsignWithCrowding = {
  name: "Somewhere",
  time_data_with_crowding_list: [
    {
      time_data: {
        delay: 0,
        scheduled_time: ["4:30", " ", "PM"],
        prediction: {
          time: ["14", " ", "min"],
          status: null,
          track: null
        } as Prediction
      },
      crowding: null,
      predicted_schedule: {
        schedule: {} as Schedule,
        prediction: {} as TripPrediction
      }
    }
  ],
  train_number: null
};
const liveDataWithPrediction = {
  headsigns: [predictionHeadsign],
  vehicles: []
};
it("indicates predictions if available", () => {
  const { asFragment, container } = mockedRenderWithStopPositionContext(
    <StopCard
      stop={lineDiagram[2]}
      onClick={handleStopClick}
      liveData={liveDataWithPrediction}
    />,
    lineDiagram
  );

  it("renders and matches snapshot", () => {
    expect(asFragment()).toMatchSnapshot();
  });

  const predictions = container.querySelector(
    ".m-schedule-diagram__predictions"
  );
  expect(predictions).toBeTruthy();
  expect(predictions?.textContent).toContain("Somewhere");
  expect(
    predictions!.querySelector(".m-schedule-diagram__prediction-time")
      ?.textContent
  ).toContain("14");
  expect(
    predictions!.querySelector(".m-schedule-diagram__prediction-time")
      ?.textContent
  ).toContain("min");
});

it.each`
  index | expectedAlerts
  ${0}  | ${0}
  ${1}  | ${1}
  ${2}  | ${1}
  ${3}  | ${0}
`(
  "shows $expectedAlerts high priority or high severity alerts for stop $index",
  ({ index, expectedAlerts }) => {
    const { container } = mockedRenderWithStopPositionContext(
      <StopCard
        stop={lineDiagram[index]}
        onClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagram
    );

    const alerts = container.querySelectorAll(
      ".m-schedule-diagram__stop-link .c-svg__icon-alerts-triangle"
    );
    expect(alerts.length).toEqual(expectedAlerts);
  }
);

it.each`
  index | expectedNames                      | expectedFeatures
  ${0}  | ${[]}                              | ${["Parking"]}
  ${1}  | ${["Orange Line", "Green Line C"]} | ${[]}
  ${2}  | ${["Route 62", "Route 67"]}        | ${["Accessible"]}
  ${3}  | ${["Atlantis"]}                    | ${["Parking", "Accessible"]}
`(
  "has appropriate tooltip content for stop $index",
  ({ index, expectedNames, expectedFeatures }) => {
    const { container } = mockedRenderWithStopPositionContext(
      <StopCard
        stop={lineDiagram[index]}
        onClick={handleStopClick}
        liveData={liveData}
      />,
      lineDiagram
    );

    const connections = container.querySelector(
      ".m-schedule-diagram__connections"
    );
    const names = Array.from(connections!.querySelectorAll("a")).map(
      c => c.dataset.originalTitle
    );
    expect(names).toEqual(expectedNames);

    const features = container.querySelector(".m-schedule-diagram__features");

    const featureNames = Array.from(
      features!.querySelectorAll<HTMLElement>("span[data-toggle='tooltip']")
    ).map(c => c.dataset.originalTitle);
    expect(featureNames).toEqual(expectedFeatures);
  }
);
