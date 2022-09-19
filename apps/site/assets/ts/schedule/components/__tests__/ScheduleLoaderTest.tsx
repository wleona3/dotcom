import React from "react";
import { screen } from "@testing-library/react";
import lineDiagramData from "./test-data/lineDiagramData.json"; // Not a full line diagram
import {
  LineDiagramStop,
  ServiceInSelector,
  RoutePatternsByDirection,
  ShapesById
} from "../__schedule";
import { DirectionId, EnhancedRoute, Route } from "../../../__v3api";
import { MapData, StaticMapData } from "../../../leaflet/components/__mapdata";
import ScheduleLoader from "../ScheduleLoader";
import * as routePatternsByDirectionData from "./test-data/routePatternsByDirectionData.json";
import { renderWithScheduleStoreProvider } from "../../../__tests__/test-helpers";

const stops = {
  "1": [
    {
      name: "SL",
      id: "741",
      is_closed: false,
      zone: "1"
    },
    {
      name: "Abc",
      id: "123",
      is_closed: false,
      zone: null
    },
    {
      name: "Wellington",
      id: "place-welln",
      is_closed: true,
      zone: null
    }
  ],
  "0": [
    {
      name: "Wellington",
      id: "place-welln",
      is_closed: true,
      zone: null
    },
    {
      name: "Abc",
      id: "123",
      is_closed: false,
      zone: null
    },
    {
      name: "SL",
      id: "741",
      is_closed: false,
      zone: "1"
    }
  ]
};

const lineDiagram = lineDiagramData as LineDiagramStop[];

const fares = [
  {
    title: "CharlieCard",
    price: "$2.25"
  },
  {
    title: "CharlieTicket or Cash",
    price: "$2.75"
  }
];

const route: EnhancedRoute = {
  alerts: [],
  description: "",
  direction_destinations: { 0: "Oak Grove", 1: "Forest Hills" },
  direction_names: { 0: "Inbound", 1: "Outbound" },
  header: "",
  id: "Orange",
  name: "Orange",
  long_name: "Orange Line",
  type: 1
};
const ferryRoute: EnhancedRoute = {
  alerts: [],
  color: "008EAA",
  description: "ferry",
  direction_destinations: { 0: "Charlestown", 1: "Long Wharf" },
  direction_names: { 0: "Outbound", 1: "Inbound" },
  header: "",
  id: "Boat-F4",
  long_name: "Charlestown Ferry",
  name: "Charlestown Ferry",
  sort_order: 30001,
  type: 4
};

const service: ServiceInSelector = {
  added_dates: [],
  added_dates_notes: {},
  description: "Weekday schedule",
  end_date: "2019-06-25",
  id: "BUS319-D-Wdy-02",
  removed_dates: [],
  removed_dates_notes: {},
  start_date: "2019-06-25",
  type: "weekday",
  typicality: "typical_service",
  valid_days: [1, 2, 3, 4, 5],
  name: "weekday",
  rating_start_date: "2019-06-25",
  rating_end_date: "2019-10-25",
  rating_description: "Test",
  "default_service?": true
};
const services = [service];

const teasers = `<div><a href="http://some-link">Some teaser from CMS</a></div>`;

const pdfs = [
  {
    url: "https://mbta.com/example-pdf.pdf",
    title: "Route 1 schedule PDF"
  }
];

const fareLink = "/fares/bus-fares";

const holidays = [
  {
    name: "Memorial Day",
    date: "May 27, 2019"
  }
];

const hours = `<div class="m-schedule-page__sidebar-hours">  <h3 class="hours-period-heading">Monday to Friday</h3>
<p class="hours-directions">
  <span class="hours-direction-name">Inbound</span>
  <span class="hours-time">04:17A-12:46A</span>
</p>
<p class="hours-directions">
  <span class="hours-direction-name">Outbound</span>
  <span class="hours-time">05:36A-01:08A</span>
</p>
</div>`;

const scheduleNoteData = {
  offpeak_service: "8-12 minutes",
  peak_service: "5 minutes",
  exceptions: [
    { service: "26 minutes", type: "weekend mornings and late night" }
  ],
  alternate_text: null
};

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

const routePatternsByDirection = routePatternsByDirectionData as RoutePatternsByDirection;

const singleDirectionRoutes: RoutePatternsByDirection = {
  "1": routePatternsByDirection["1"]
};

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

const schedulePageData = {
  schedule_note: null,
  connections: [],
  fares,
  fare_link: fareLink, // eslint-disable-line camelcase
  hours,
  holidays,
  pdfs,
  teasers,
  route,
  services,
  stops,
  direction_id: 0 as DirectionId,
  route_patterns: routePatternsByDirection,
  line_diagram: lineDiagram,
  today: "2019-12-05",
  variant: null
};

// stub out the inner components - we don't need their actual content, just want to know if they exist
jest.mock("../ScheduleDirection", () => ({
  __esModule: true,
  default: () => {
    return <div>ScheduleDirection</div>;
  }
}));
jest.mock("../ScheduleFinder", () => ({
  __esModule: true,
  default: () => {
    return <div>ScheduleFinder</div>;
  }
}));

// stub out surrounding HTML document structure with included data
const stubHtml = document.createElement("section");
const jsMap = document.createElement("script");
jsMap.id = "js-map-data";
jsMap.type = "text/plain";
jsMap.innerHTML = JSON.stringify(mapData);
const staticMap = document.createElement("script");
staticMap.id = "static-map-data";
staticMap.type = "text/plain";
staticMap.innerHTML = JSON.stringify(staticMapData);
[jsMap, staticMap].forEach(node => stubHtml.appendChild(node));

function renderWithProvider(ui: React.ReactElement) {
  renderWithScheduleStoreProvider(ui, undefined, {
    baseElement: document.body.appendChild(stubHtml)
  });
}

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => mockDispatch
}));

describe("<ScheduleLoader />", () => {
  beforeEach(() => {
    renderWithProvider(<ScheduleLoader schedulePageData={schedulePageData} />);
  });

  test("renders a <ScheduleDirection />", () => {
    expect(screen.getByText("ScheduleDirection")).toBeTruthy();
  });

  test("dispatches INITIALIZE action", () => {
    expect(mockDispatch).toHaveBeenCalledWith({ type: "INITIALIZE" });
  });
});

test("Unidirectional <ScheduleLoader /> dispatches CHANGE_DIRECTION action", () => {
  renderWithProvider(
    <ScheduleLoader
      schedulePageData={{
        ...schedulePageData,
        route_patterns: singleDirectionRoutes
      }}
    />
  );
  expect(mockDispatch).toHaveBeenCalledWith({
    type: "CHANGE_DIRECTION",
    payload: { selectedDirection: 1 }
  });
});

describe("Ferry route <ScheduleLoader />", () => {
  beforeEach(() => {
    renderWithProvider(
      <ScheduleLoader
        schedulePageData={{ ...schedulePageData, route: ferryRoute }}
      />
    );
  });

  test("includes static data", () => {
    const img: HTMLImageElement = screen.getByAltText(
      `${ferryRoute.name} route map`
    );
    expect(img).toBeTruthy();
    expect(img.src).toEqual(staticMapData.img_src);
    const link: HTMLAnchorElement = screen.getByText("View map as a PDF");
    expect(link).toBeTruthy();
  });

  test("renders a <ScheduleFinder />", () => {
    expect(screen.getByText("ScheduleFinder")).toBeTruthy();
  });

  test("does not render a <ScheduleDirection />", () => {
    expect(screen.queryByText("ScheduleDirection")).toBeNull();
  });
});
