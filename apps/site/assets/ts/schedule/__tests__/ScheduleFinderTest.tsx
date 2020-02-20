import React from "react";
import { ReactWrapper, mount } from "enzyme";
import ScheduleFinder from "../components/ScheduleFinder";
import { EnhancedRoute } from "../../__v3api";
import {
  RoutePatternsByDirection,
  ServiceInSelector
} from "../components/__schedule";
import { ModalProvider } from "./../components/schedule-finder/ModalContext";
import WrappedModal from "../../components/Modal";

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

// the enzyme test was done as one test because there was
// an issue mounting it more than once due to the focus-trap
// dependency that the Modal component depends on

/* eslint-disable @typescript-eslint/camelcase */
const today = "2019-12-05";
const body = '<div id="react-root"></div>';
const route: EnhancedRoute = {
  alert_count: 0,
  description: "",
  direction_destinations: { 0: "Oak Grove", 1: "Forest Hills" },
  direction_names: { 0: "Inbound", 1: "Outbound" },
  header: "",
  id: "Orange",
  long_name: "Orange Line",
  name: "Orange",
  type: 1
};
const oneDirectionRoute: EnhancedRoute = {
  alert_count: 0,
  description: "",
  direction_destinations: { 0: "Destination", 1: null },
  direction_names: { 0: "Outbound", 1: null },
  header: "",
  id: "route",
  long_name: "the route",
  name: "Route",
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
      route_id: "CR-Fitchburg",
      representative_trip_id: "CR-Weekday-Spring-19-401",
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
      route_id: "CR-Fitchburg",
      representative_trip_id: "CR-Weekday-Spring-19-400",
      name: "Wachusett - North Station",
      headsign: "North Station",
      id: "CR-Fitchburg-0-1",
      direction_id: 1
    }
  ]
} as RoutePatternsByDirection;

it("renders", () => {
  const tree = mount(
    <ScheduleFinder
      route={route}
      stops={stops}
      services={services}
      routePatternsByDirection={routePatternsByDirection}
      today={today}
      scheduleNote={null}
    />,
    {
      wrappingComponent: ModalProvider,
      wrappingComponentProps: {
        modalId: "test",
        selectedDirection: 0,
        selectedOrigin: null
      }
    }
  );
  expect(tree.html()).toMatchSnapshot();
});

it("defaults to the sole direction for unidirectional routes", () => {
  const wrapper = mount(
    <ScheduleFinder
      route={oneDirectionRoute}
      stops={stops}
      services={services}
      routePatternsByDirection={routePatternsByDirection}
      today={today}
      scheduleNote={null}
    />,
    {
      wrappingComponent: ModalProvider,
      wrappingComponentProps: {
        modalId: "test",
        selectedDirection: 0,
        selectedOrigin: null
      }
    }
  );

  expect(wrapper.find("#sf_direction_select").prop("value")).toEqual(0);
});

describe("modal", () => {
  let wrapper: ReactWrapper;
  beforeEach(() => {
    wrapper = mount(
      <ScheduleFinder
        route={route}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={null}
      />,
      {
        wrappingComponent: ModalProvider,
        wrappingComponentProps: {
          modalId: "test",
          selectedDirection: 0,
          selectedOrigin: null
        }
      }
    );
  });

  it("does not show when there are errors", () => {
    wrapper
      .find("#sf_direction_select")
      .simulate("change", { target: { value: "" } });

    wrapper
      .find("#sf_origin_select")
      .simulate("change", { target: { value: "" } });

    wrapper.find("input").simulate("click"); // "Get schedules"

    expect(wrapper.exists(".error-container")).toBeTruthy();

    // the schedule modal should not be showing
    expect(wrapper.find(WrappedModal).prop("openState")).toBeFalsy();
  });

  it("shows schedules when there are no errors", () => {
    wrapper
      .find("#sf_direction_select")
      .simulate("change", { target: { value: "0" } });

    wrapper
      .find("#sf_origin_select")
      .simulate("change", { target: { value: "place-welln" } });

    wrapper.find("input").simulate("click"); // "Get schedules"

    expect(wrapper.exists(".error-container")).toBeFalsy();

    // the schedule modal should be showing
    expect(wrapper.find(WrappedModal).prop("openState")).toBeTruthy();
  });

  it("can be controlled with keyboard input", () => {
    wrapper.find("#sf_origin_select").simulate("keyUp", { key: "Enter" });
    wrapper.find("#sf_direction_select").simulate("keyUp", { key: "Enter" });
    wrapper.find("#sf_origin_select").simulate("click");
  });

  it("shows origin picker only when there are no direction errors", () => {
    wrapper
      .find("#sf_direction_select")
      .simulate("change", { target: { value: "" } });

    wrapper
      .find("#sf_origin_select_container")
      .hostNodes()
      .simulate("click");

    expect(wrapper.exists(".error-container")).toBeTruthy();
    let originModal = wrapper
      .find(WrappedModal)
      .filterWhere(
        n => n.prop("className") === "schedule-finder__origin-modal"
      );

    expect(originModal.exists()).toBeFalsy();

    wrapper
      .find("#sf_direction_select")
      .simulate("change", { target: { value: "0" } });

    wrapper
      .find("#sf_origin_select_container")
      .hostNodes()
      .simulate("click");

    expect(wrapper.exists(".error-container")).toBeFalsy();

    originModal = wrapper
      .find(WrappedModal)
      .filterWhere(
        n => n.prop("className") === "schedule-finder__origin-modal"
      );

    expect(originModal.prop("openState")).toBeTruthy();
  });

  it("allows interactive search for origin stop", () => {
    wrapper
      .find("#sf_origin_select_container")
      .hostNodes()
      .simulate("click");

    expect(wrapper.find(".schedule-finder__origin-list-item").length).toBe(3);

    wrapper
      .find("input#origin-filter")
      .simulate("change", { target: { value: "Wellington" } });

    expect(wrapper.find(".schedule-finder__origin-list-item").length).toBe(1);

    wrapper
      .find("input#origin-filter")
      .simulate("change", { target: { value: "" } });

    // click origin modal line item
    wrapper
      .find(".schedule-finder__origin-list-item")
      .at(0)
      .simulate("click");

    // keyup on origin modal line item
    wrapper
      .find("#sf_origin_select_container")
      .hostNodes()
      .simulate("click");

    wrapper
      .find(".schedule-finder__origin-list-item")
      .at(2)
      .simulate("keyUp", { key: "Enter" });
  });

  afterEach(() => {
    wrapper.unmount();
  });
});
