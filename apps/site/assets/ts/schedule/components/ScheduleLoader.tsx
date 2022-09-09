import React, { ReactElement } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import ScheduleDirection from "./ScheduleDirection";
import { SchedulePageData } from "../components/__schedule";
import { MapData, StaticMapData } from "../../leaflet/components/__mapdata";
import ScheduleFinder from "./ScheduleFinder";
import { DirectionId } from "../../__v3api";
import {
  getPageDirection,
  mapStateToProps,
  resetDirection
} from "../store/schedule-store";
import { routeToModeName } from "../../helpers/css";
import currentLineSuspensions from "../../helpers/line-suspensions";

interface Props {
  schedulePageData: SchedulePageData;
}

export const ScheduleLoader = ({
  schedulePageData
}: Props): ReactElement<HTMLElement> => {
  const scheduleDispatch = useDispatch();
  React.useEffect(() => {
    // initialize Store using URL parameters
    scheduleDispatch({ type: "INITIALIZE" });
    // we disable linting in this next line because we DO want to specify an empty array since we want this piece to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDirection = useSelector(getPageDirection);

  const {
    route,
    stops,
    services,
    route_patterns: routePatternsByDirection,
    schedule_note: scheduleNote,
    today,
    line_diagram: lineDiagram,
    variant: busVariantId
  } = schedulePageData;

  const routeIsSuspended =
    Object.keys(routePatternsByDirection).length === 0 ||
    currentLineSuspensions(route.id);

  // check first if this is a unidirectional route:
  if (
    !routeIsSuspended &&
    !Object.keys(routePatternsByDirection).includes(
      selectedDirection.toString()
    )
  ) {
    // This route doesn't have this direction, so pick first existing direction
    const readjustedDirectionId = parseInt(
      Object.keys(routePatternsByDirection)[0],
      10
    ) as DirectionId;
    scheduleDispatch(resetDirection(readjustedDirectionId));
  }

  const isFerryRoute = routeToModeName(route) === "ferry";

  let mapData: MapData | undefined;
  const mapDataEl = document.getElementById("js-map-data");
  if (mapDataEl) {
    mapData = JSON.parse(mapDataEl.innerHTML);
  }

  let staticMapData: StaticMapData | undefined;
  const staticDataEl = document.getElementById("static-map-data");
  if (staticDataEl) {
    staticMapData = JSON.parse(staticDataEl.innerHTML);
  }

  return isFerryRoute ? (
    <>
      <ScheduleFinder
        route={route}
        stops={stops}
        services={services}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={null}
      />
      <div className="schedule-map-container">
        <h2>Route Map</h2>
        {staticMapData && (
          <>
            <img
              src={staticMapData.img_src}
              alt={`${route.name} route map`}
              className="img-fluid"
            />
            <a
              href={staticMapData.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa fa-search-plus" aria-hidden="true" />
              View map as a PDF
            </a>
          </>
        )}
      </div>
    </>
  ) : (
    <ScheduleDirection
      directionId={selectedDirection}
      route={route}
      routePatternsByDirection={routePatternsByDirection}
      mapData={mapData}
      staticMapData={staticMapData}
      lineDiagram={lineDiagram}
      services={services}
      stops={stops}
      today={today}
      scheduleNote={scheduleNote}
      busVariantId={busVariantId}
    />
  );
};

export default connect(mapStateToProps)(ScheduleLoader);
