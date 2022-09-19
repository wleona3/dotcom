import { screen } from "@testing-library/react";
import React from "react";
import { renderWithScheduleStoreProvider } from "../../../../__tests__/test-helpers";
import { Route } from "../../../../__v3api";
import {
  changeScheduleFinderOrigin,
  createScheduleStore,
  openOriginModal
} from "../../../store/schedule-store";
import { RoutePatternsByDirection, ServiceInSelector } from "../../__schedule";
import * as routePatternsByDirectionData from "../../__tests__/test-data/routePatternsByDirectionData.json";
import ScheduleFinderModal from "../ScheduleFinderModal";

const routePatternsByDirection = routePatternsByDirectionData as RoutePatternsByDirection;

const services: ServiceInSelector[] = [
  {
    valid_days: [1, 2, 3, 4, 5],
    typicality: "typical_service",
    type: "weekday",
    start_date: "2019-07-08",
    removed_dates_notes: {},
    removed_dates: [],
    name: "Weekday",
    id: "BUS319-J-Wdy-02",
    end_date: "2019-08-30",
    description: "Weekday schedule",
    added_dates_notes: {},
    added_dates: [],
    rating_start_date: "2019-06-25",
    rating_end_date: "2019-10-25",
    rating_description: "Test",
    "default_service?": true
  },
  {
    valid_days: [6],
    typicality: "typical_service",
    type: "saturday",
    start_date: "2019-07-13",
    removed_dates_notes: {},
    removed_dates: [],
    name: "Saturday",
    id: "BUS319-K-Sa-02",
    end_date: "2019-08-31",
    description: "Saturday schedule",
    added_dates_notes: {},
    added_dates: [],
    rating_start_date: "2019-06-25",
    rating_end_date: "2019-10-25",
    rating_description: "Test",
    "default_service?": false
  },
  {
    valid_days: [7],
    typicality: "typical_service",
    type: "sunday",
    start_date: "2019-07-14",
    removed_dates_notes: {},
    removed_dates: [],
    name: "Sunday",
    id: "BUS319-L-Su-02",
    end_date: "2019-08-25",
    description: "Sunday schedule",
    added_dates_notes: {},
    added_dates: [],
    rating_start_date: "2019-06-25",
    rating_end_date: "2019-10-25",
    rating_description: "Test",
    "default_service?": false
  }
];

const today = "2019-12-05";

const route: Route = {
  description: "",
  direction_destinations: { 0: "Oak Grove", 1: "Forest Hills" },
  direction_names: { 0: "Inbound", 1: "Outbound" },
  id: "Orange",
  long_name: "Orange Line",
  name: "Orange",
  type: 1
};

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
      name: "Def",
      id: "456",
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

// redux store/provider
const store = createScheduleStore(0);
store.dispatch(changeScheduleFinderOrigin("123")); // initializes origin value

function renderWithProvider(ui: React.ReactElement) {
  return renderWithScheduleStoreProvider(ui, store);
}

jest.mock("../OriginModalContent", () => ({
  __esModule: true,
  default: () => {
    return <div>OriginModalContent</div>;
  }
}));

jest.mock("../ScheduleModalContent", () => ({
  __esModule: true,
  default: () => {
    return <div>ScheduleModalContent</div>;
  }
}));

describe("<ScheduleFinderModal />", () => {
  beforeEach(() => {
    renderWithProvider(
      <ScheduleFinderModal
        route={route}
        routePatternsByDirection={routePatternsByDirection}
        scheduleNote={null}
        services={services}
        stops={stops}
        today={today}
      />
    );
  });

  test("can show a <ScheduleModalContent />", () => {
    expect(screen.getByText("ScheduleModalContent")).toBeTruthy();
    expect(screen.queryByText("OriginModalContent")).toBeNull();
  });

  test("can show a <OriginModalContent />", () => {
    store.dispatch(openOriginModal());
    expect(screen.queryByText("ScheduleModalContent")).toBeNull();
    expect(screen.getByText("OriginModalContent")).toBeTruthy();
  });
});
