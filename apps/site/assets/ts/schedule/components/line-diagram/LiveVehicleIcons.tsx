import React, { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { useSelector } from "react-redux";
import { uniq } from "lodash";
import { CrowdingType } from "../__schedule";
import CrowdingPill from "./CrowdingPill";
import { TooltipWrapper, vehicleArrowIcon } from "../../../helpers/icon";
import { StopCoord, CoordState, CIRC_RADIUS } from "./graphics/graphic-helpers";
import { MapMarker } from "../../../leaflet/components/__mapdata";
import useVehicleMarkersChannel from "../../../hooks/useVehicleChannel";

interface VehicleIconsProps {
  stop_id: string;
  vehicles: MapMarker[] | null;
}

const CrowdingIconString = (vehicle_crowding: CrowdingType): string =>
  renderToString(<CrowdingPill crowding={vehicle_crowding} />);

export const VehicleIcons = ({
  stop_id,
  vehicles
}: VehicleIconsProps): JSX.Element | null => {
  const coords: StopCoord | null = useSelector(
    (state: CoordState) => state[stop_id]
  );
  if (!vehicles || !coords) return null;
  const [x, y] = coords;
  const left = `${x - CIRC_RADIUS}px`;
  const tooltips = vehicles.map(vehicle => {
    const top = vehicle.vehicle_status
      ? `${
          {
            // eslint-disable-next-line camelcase
            in_transit: y - 50,
            incoming: y - 25,
            stopped: y - 10
          }[vehicle.vehicle_status]
        }px`
      : `${y}px`;

    return (
      <div
        key={vehicle.id || `vehicle-${stop_id}`}
        className="m-schedule-diagram__vehicle"
        style={{ top, left }}
      >
        <TooltipWrapper
          tooltipText={`<div class="m-schedule-diagram__vehicle-tooltip">${
            vehicle.vehicle_crowding
              ? `${CrowdingIconString(vehicle.vehicle_crowding)}<br/>`
              : ""
          } ${vehicle.tooltip_text}</div>`}
          tooltipOptions={{ placement: "right", animation: false, html: true }}
        >
          {vehicleArrowIcon("m-schedule-diagram__vehicle--icon")}
        </TooltipWrapper>
      </div>
    );
  });

  return <>{tooltips}</>;
};

const vehiclesForStop = (
  all_vehicles: MapMarker[],
  stop: string
): ReactElement | null => {
  const vehicles = all_vehicles.filter(({ stop_id }) => stop_id === stop);
  if (!vehicles.length) return null;
  return <VehicleIcons key={stop} stop_id={stop} vehicles={vehicles} />;
};

const LiveVehicles = ({ channel }: { channel: string }): JSX.Element | null => {
  const vehicleMarkers = useVehicleMarkersChannel(channel);
  const stops = uniq(
    vehicleMarkers.filter(vm => vm.stop_id).map(vm => vm.stop_id!)
  );
  if (!stops.length) return null;
  return <>{stops.map(s_id => vehiclesForStop(vehicleMarkers, s_id))}</>;
};

export default LiveVehicles;
