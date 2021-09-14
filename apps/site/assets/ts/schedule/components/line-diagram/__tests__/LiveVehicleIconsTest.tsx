import React from "react";
import * as redux from "react-redux";
import { mount, ReactWrapper } from "enzyme";
import { cloneDeep } from "lodash";
import { RouteStop, LineDiagramStop } from "../../__schedule";
import LiveVehicles, { VehicleIcons } from "../LiveVehicleIcons";
import { createLineDiagramCoordStore } from "../graphics/graphic-helpers";
import { MapMarker } from "../../../../leaflet/components/__mapdata";
import * as UseVehicleChannel from "../../../../hooks/useVehicleChannel";

// mock the redux state
jest.spyOn(redux, "useSelector").mockImplementation(selector =>
  selector({
    "test-stop": [12, 80]
  })
);
const stop = { id: "test-stop", name: "Test Stop" } as RouteStop;
export const vehicles = [
  {
    id: "vehicle-1",
    vehicle_status: "in_transit",
    tooltip_text: "tooltip text for vehicle 1",
    stop_id: stop.id
  },
  {
    id: "vehicle-2",
    vehicle_status: "incoming",
    tooltip_text: "tooltip text for vehicle 2",
    stop_id: stop.id
  },
  {
    id: "vehicle-3",
    vehicle_status: "stopped",
    tooltip_text: "tooltip text for vehicle 3",
    stop_id: stop.id
  }
] as MapMarker[];

const other_vehicles = cloneDeep(vehicles).map(v => {
  v.stop_id = "test-stop-other";
  return v;
});
const store = createLineDiagramCoordStore([
  { route_stop: stop } as LineDiagramStop
]);

const tooltipText = (wrapper: ReactWrapper) =>
  wrapper.find("[tooltipText]").prop("tooltipText");

describe("VehicleIcons", () => {
  let wrapper: ReactWrapper;
  beforeEach(() => {
    wrapper = mount(
      <redux.Provider store={store}>
        <VehicleIcons stop_id={stop.id} vehicles={vehicles} />
      </redux.Provider>
    );
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it("renders and matches snapshot", () => {
    expect(wrapper.debug()).toMatchSnapshot();
  });

  it("renders each vehicle", () => {
    const vehicleNodes = wrapper.find(".m-schedule-diagram__vehicle");
    expect(vehicleNodes).toHaveLength(vehicles.length);
  });

  it.each`
    index | expectedPosition | status
    ${0}  | ${30}            | ${"in_transit"}
    ${1}  | ${55}            | ${"incoming"}
    ${2}  | ${70}            | ${"stopped"}
  `(
    "positions vehicles according to status $status",
    ({ index, expectedPosition }) => {
      const node = wrapper.find(".m-schedule-diagram__vehicle").at(index);
      const { top } = node.get(0).props.style; // e.g. "30px"
      const top_number = parseInt(top.substring(0, 2)); // e.g. 30
      expect(top_number).toEqual(expectedPosition);
    }
  );

  it("displays the vehicle's tooltip_text", () => {
    for (let index of [0, 1, 2]) {
      const node = wrapper.find(".m-schedule-diagram__vehicle").at(index);
      expect(tooltipText(node)).toContain(vehicles[index].tooltip_text);
    }
  });
});

it("VehicleIcons does not render if store has no data for the relevant stop id", () => {
  const wrapperWithoutStopData = mount(
    <redux.Provider store={store}>
      <VehicleIcons stop_id={"test-stop-other"} vehicles={other_vehicles} />
    </redux.Provider>
  );
  expect(wrapperWithoutStopData.find(VehicleIcons).html()).toBeNull();
});

describe("LiveVehicles", () => {
  it("does not render if the channel returns no vehicles", () => {
    // mock useVehicleMarkersChannel to return no vehicles
    jest.spyOn(UseVehicleChannel, "default").mockImplementation(() => []);
    const wrapper = mount(
      <redux.Provider store={store}>
        <LiveVehicles channel="vehicles:MyRoute:0" />
      </redux.Provider>
    );
    expect(wrapper.find(LiveVehicles).html()).toBeNull();
  });

  it("does not render if the channel returns vehicles with no stop ids", () => {
    const vehiclesWithoutStops = cloneDeep(vehicles).map(v => {
      delete v.stop_id;
      return v;
    });
    // mock useVehicleMarkersChannel to return vehicles without stop_id
    jest
      .spyOn(UseVehicleChannel, "default")
      .mockImplementation(() => vehiclesWithoutStops);
    const wrapper = mount(
      <redux.Provider store={store}>
        <LiveVehicles channel="vehicles:MyRoute:0" />
      </redux.Provider>
    );
    expect(wrapper.find(LiveVehicles).html()).toBeNull();
  });

  it("renders vehicles if the channel returns vehicles", () => {
    // mock useVehicleMarkersChannel to return vehicles
    jest.spyOn(UseVehicleChannel, "default").mockImplementation(() => vehicles);
    const wrapper = mount(
      <redux.Provider store={store}>
        <LiveVehicles channel="vehicles:MyRoute:0" />
      </redux.Provider>
    );
    expect(wrapper.find(LiveVehicles).html()).not.toBeNull();
    expect(wrapper.find(VehicleIcons).exists()).toBeTruthy();
    expect(wrapper.find(VehicleIcons).prop("stop_id")).toEqual(stop.id);
    expect(wrapper.find(LiveVehicles).debug()).toMatchSnapshot();
    const vehicleNodes = wrapper
      .find(VehicleIcons)
      .find(".m-schedule-diagram__vehicle");
    expect(vehicleNodes).toHaveLength(vehicles.length);
  });
});
