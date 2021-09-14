import { MapMarker } from "../../leaflet/components/__mapdata";
import { Action, EventData, reducer } from "../useVehicleChannel"
import { vehicles } from "../../schedule/components/line-diagram/__tests__/LiveVehicleIconsTest";
import { cloneDeep } from "lodash";

const initialState = [] as MapMarker[];
const vehicleMarkers = cloneDeep(vehicles).map(v => {
  v.icon = "vehicle-bordered-expanded";
  return v;
});

describe("useVehicleChannel reducer", () => {
  it("handles setChannel event", () => {
    const newState = reducer(initialState, {
      action: {
        event: "setChannel",
        data: []
      },
      channel: "channel1"
    });

    expect(newState).toEqual([]);
  });

  it("handles reset event", () => {
    const data = [{ marker: vehicleMarkers[0]}];
    const newState = reducer(initialState, {
      action: {
        event: "reset",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toHaveLength(data.length);
    expect(newState.map(v => v.id)).toEqual(data.map(v => v.marker.id));
  });

  it("handles add event", () => {
    const data = vehicleMarkers.map(v => ({ marker: v }))
    const newState = reducer(initialState, {
      action: {
        event: "add",
        data: data
      },
      channel: "channel1"
    })

    expect(newState).toHaveLength(data.length);
    expect(newState.map(v => v.id)).toEqual(data.map(v => v.marker.id));
  });

  it("handles update event", () => {
    const data = [{ marker: vehicleMarkers[0]}]
    const newState = reducer(initialState, {
      action: {
        event: "update",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toHaveLength(data.length);
    expect(newState.map(v => v.id)).toEqual(data.map(v => v.marker.id));
  });
  
  it("handles update event without data", () => {
    const data = [] as EventData[];
    const newState = reducer(initialState, {
      action: {
        event: "update",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toEqual(initialState)
  });

  it("handles remove event", () => {
    const newState = reducer(initialState, {
      action: {
        event: "remove",
        data: ["vehicle1"]
      },
      channel: "channel1"
    })

    expect(newState).toEqual([]);
  });

  it("does not handle unknown event", () => {
    const newState = () => reducer(initialState, {
      action: {} as Action,
      channel: "channel1"
    });

    expect(newState).toThrow(Error);
    expect(newState).toThrow("unexpected event");
  })
});

describe("useVehicleChannel reducer with populated initial state", () => {
  it("handles setChannel event", () => {
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "setChannel",
        data: []
      },
      channel: "channel1"
    });

    expect(newState).toEqual([]);
  });

  it("handles reset event", () => {
    const data = [{ marker: vehicleMarkers[0]}];
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "reset",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toHaveLength(data.length);
    expect(newState.map(v => v.id)).toEqual(data.map(v => v.marker.id));
  });

  it("handles add event", () => {
    const data = vehicleMarkers.map(v => ({ marker: v }))
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "add",
        data: data
      },
      channel: "channel1"
    })

    expect(newState).toHaveLength(data.length + vehicleMarkers.length);
    expect(newState.map(v => v.id)).toEqual(data.map(v => v.marker.id).concat(vehicleMarkers.map(v => v.id)));
  });

  it("handles update event", () => {
    const data = [{ marker: vehicleMarkers[0]}]
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "update",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toHaveLength(vehicleMarkers.length);
    expect(newState.map(v => v.id)).toEqual(vehicleMarkers.map(v => v.id));
  });
  
  it("handles update event without data", () => {
    const data = [] as EventData[];
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "update",
        data: data
      },
      channel: "channel1"
    });

    expect(newState).toEqual(vehicleMarkers)
  });

  it("handles remove event", () => {
    const newState = reducer(vehicleMarkers, {
      action: {
        event: "remove",
        data: ["vehicle-1"]
      },
      channel: "channel1"
    })

    expect(newState.map(v => v.id)).not.toContain("vehicle-1");
    expect(newState).toHaveLength(vehicleMarkers.length - 1);
  });

  it("does not handle unknown event", () => {
    const newState = () => reducer(vehicleMarkers, {
      action: {} as Action,
      channel: "channel1"
    });

    expect(newState).toThrow(Error);
    expect(newState).toThrow("unexpected event");
  })
});