import React, { ReactElement, useRef } from "react";
import Map from "../../leaflet/components/Map";
import getBounds from "../../leaflet/bounds";
import {
  MapData,
  MapMarker as Marker
} from "../../leaflet/components/__mapdata";
import CrowdingPill from "./line-diagram/CrowdingPill";
import useVehicleMarkersChannel from "../../hooks/useVehicleChannel";

interface Props {
  channel: string;
  data: MapData;
  currentShapes: string[];
  currentStops: string[];
}

export const iconOpts = (
  icon: string | null
): {
  icon_size?: [number, number];
  icon_anchor?: [number, number];
} => {
  switch (icon) {
    case null:
      return {};

    case "vehicle-bordered-expanded":
      return {
        icon_size: [18, 18], // eslint-disable-line camelcase
        icon_anchor: [6, 6] // eslint-disable-line camelcase
      };

    case "stop-circle-bordered-expanded":
      return {
        icon_size: [12, 12], // eslint-disable-line camelcase
        icon_anchor: [6, 6] // eslint-disable-line camelcase
      };

    default:
      throw new Error(`unexpected icon type: ${icon}`);
  }
};

const zIndex = (icon: string | null): number | undefined =>
  icon === "vehicle-bordered-expanded" ? 1000 : undefined;

export const updateMarker = (marker: Marker): Marker => ({
  ...marker,
  tooltip: (
    <div>
      {marker.vehicle_crowding && (
        <>
          <CrowdingPill crowding={marker.vehicle_crowding} />
          <br />
        </>
      )}
      {marker.tooltip_text}
    </div>
  ),
  icon_opts: iconOpts(marker.icon), // eslint-disable-line camelcase
  z_index: zIndex(marker.icon) // eslint-disable-line camelcase
});

export const isVehicleMarker = (marker: Marker): boolean =>
  marker.icon ? marker.icon.includes("vehicle") : false;

export interface IdHash {
  [id: string]: true;
}

export const shouldRemoveMarker = (
  id: string | null,
  idHash: IdHash
): boolean => id !== null && idHash[id] === true;

export default ({
  data,
  channel,
  currentShapes,
  currentStops
}: Props): ReactElement<HTMLElement> | null => {
  const state = useVehicleMarkersChannel(channel);
  const stopMarkers = data.stop_markers
    ? data.stop_markers
        .filter(mark => currentStops.includes(mark.id as string))
        .map(marker => updateMarker(marker))
    : [];

  const mapData = {
    ...data,
    polylines: data.polylines.filter(p =>
      currentShapes.some(shape => shape === p.id)
    ),
    markers: state.concat(stopMarkers)
  };
  const bounds = useRef(getBounds(stopMarkers));
  return (
    <div className="m-schedule__map">
      <Map bounds={bounds.current} mapData={mapData} />
    </div>
  );
};
