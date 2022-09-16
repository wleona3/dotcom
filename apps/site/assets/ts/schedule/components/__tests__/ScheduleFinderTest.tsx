import React from "react";
import ScheduleFinder from "../ScheduleFinder";
import { EnhancedRoute } from "../../../__v3api";
import { RoutePatternsByDirection, ServiceInSelector } from "../__schedule";
import * as scheduleStoreModule from "../../store/schedule-store";
import { screen } from "@testing-library/react";
import { renderWithScheduleStoreProvider } from "../../../__tests__/util";

const scheduleNoteData = {
  offpeak_service: "8-12 minutes",
  peak_service: "5 minutes",
  exceptions: [
    { service: "26 minutes", type: "weekend mornings and late night" }
  ],
  alternate_text: null
};

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

const route: EnhancedRoute = {
  alerts: [],
  description: "",
  direction_destinations: { 0: "Oak Grove", 1: "Forest Hills" },
  direction_names: { 0: "Inbound", 1: "Outbound" },
  header: "",
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

const routePatternsByDirection = {
  "0": [
    {
      typicality: 1,
      time_desc: "School Trip",
      shape_id: "9840004",
      shape_priority: 1,
      route_id: "CR-Fitchburg",
      representative_trip_id: "CR-Weekday-Spring-19-401",
      representative_trip_polyline: "qwerty123@777njhgb",
      stop_ids: ["123", "456", "789"],
      name: "North Station - Wachusett",
      headsign: "Wachusett",
      id: "CR-Fitchburg-0-0",
      direction_id: 0
    }
  ],
  "1": [
    {
      typicality: 1,
      time_desc: "School Trip",
      shape_id: "9840003",
      shape_priority: 1,
      route_id: "CR-Fitchburg",
      representative_trip_id: "CR-Weekday-Spring-19-400",
      representative_trip_polyline: "lkjhg987bvcxz88!",
      stop_ids: ["123", "555", "789"],
      name: "Wachusett - North Station",
      headsign: "North Station",
      id: "CR-Fitchburg-0-1",
      direction_id: 1
    }
  ]
} as RoutePatternsByDirection;

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

jest.mock("../schedule-finder/ScheduleFinderForm", () => ({
  __esModule: true,
  default: () => {
    return <div>ScheduleFinderForm</div>;
  }
}));
jest.mock("../schedule-finder/ScheduleFinderModal", () => ({
  __esModule: true,
  default: () => {
    return <div>ScheduleFinderModal</div>;
  }
}));

describe("<ScheduleFinder />", () => {
  test("shows <ScheduleFinderForm /> when no schedule note", () => {
    renderWithScheduleStoreProvider(
      <ScheduleFinder
        route={route}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={null}
      />
    );
    expect(screen.getByText("ScheduleFinderForm")).toBeTruthy();
  });

  test("hides <ScheduleFinderForm /> when there is a schedule note", () => {
    renderWithScheduleStoreProvider(
      <ScheduleFinder
        route={route}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={scheduleNoteData}
      />
    );
    expect(screen.queryByText("ScheduleFinderForm")).toBeNull();
  });

  test("uses different layout for ferry", () => {
    const { container } = renderWithScheduleStoreProvider(
      <ScheduleFinder
        route={ferryRoute}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={null}
      />
    );

    expect(
      container.getElementsByClassName("schedule-finder-vertical")
    ).toBeTruthy();
  });

  test("shows <ScheduleFinderModal /> depending on modalOpen state", () => {
    const store = scheduleStoreModule.createScheduleStore(0);
    renderWithScheduleStoreProvider(
      <ScheduleFinder
        route={route}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={null}
      />,
      store
    );

    expect(screen.queryByText("ScheduleFinderModal")).toBeNull();
    expect(store.getState().modalOpen).toBe(false);
    store.dispatch(scheduleStoreModule.openScheduleModal());
    expect(screen.getByText("ScheduleFinderModal")).toBeTruthy();
    expect(store.getState().modalOpen).toBe(true);
  });
});
