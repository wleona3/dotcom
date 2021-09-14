import { Dispatch, useReducer, useEffect } from "react";
import { MapMarker } from "../leaflet/components/__mapdata";
import {
  initChannel,
  SocketEvent,
  stopChannel
} from "../schedule/components/Channel";
import {
  IdHash,
  shouldRemoveMarker,
  isVehicleMarker,
  updateMarker
} from "../schedule/components/Map";

export interface EventData {
  marker: MapMarker;
}

export type Action = SocketEvent<EventData[]>;

interface ActionWithChannel {
  action: Action;
  channel: string;
}

const setupChannels = (
  channel: string,
  dispatch: Dispatch<ActionWithChannel>
): void => {
  dispatch({ action: { event: "setChannel", data: [] }, channel });
  /* istanbul ignore next */
  initChannel<EventData[]>(channel, (action: Action) =>
    dispatch({ action, channel })
  );
  /* istanbul ignore next */
  initChannel<EventData[]>("vehicles:remove", (action: Action) =>
    dispatch({ action, channel })
  );
};

const stopChannels = (channel: string): void => {
  stopChannel(channel);
  stopChannel("vehicles:remove");
};

type VehicleMarkerState = MapMarker[];

/* Synchronize vehicle_channel.ex channel state with this component state */
export const reducer = (
  state: VehicleMarkerState,
  actionWithChannel: ActionWithChannel
): VehicleMarkerState => {
  const { action } = actionWithChannel;
  switch (action.event) {
    case "setChannel":
      return [];
    case "reset":
      return state
        .filter(marker => !isVehicleMarker(marker))
        .concat(
          action.data.map(({ marker }: EventData) => updateMarker(marker))
        );

    case "add":
      return state.concat(
        action.data.map(({ marker }) => updateMarker(marker))
      );

    case "update":
      if (action.data.length === 0) {
        return state;
      }
      // Filter out the existing marker if necessary, always add new marker
      return [
        updateMarker(action.data[0].marker),
        ...state.filter(marker => marker.id !== action.data[0].marker.id)
      ];
    case "remove":
      return state.filter(
        marker =>
          !shouldRemoveMarker(
            marker.id,
            action.data.reduce((acc: IdHash, id: string) => {
              acc[id] = true;
              return acc;
            }, {})
          )
      );
    default:
      /* istanbul ignore next */
      throw new Error(`unexpected event: ${action}`);
  }
};

const useVehicleMarkersChannel = (channel: string): VehicleMarkerState => {
  const [state, dispatch] = useReducer(reducer, []);
  useEffect(
    () => {
      setupChannels(channel, dispatch);
      return () => stopChannels(channel);
    },
    [channel, dispatch]
  );

  return state;
};

export default useVehicleMarkersChannel;
