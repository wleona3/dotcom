import React, { ReactElement } from "react";
import { connect } from "react-redux";
import { getParam } from "../../helpers/use-params";
import ScheduleDirection from "./ScheduleDirection";
import {
  SchedulePageData,
  SelectedOrigin,
  ComponentToRender
} from "../components/__schedule";
import { MapData, StaticMapData } from "../../leaflet/components/__mapdata";
import ScheduleFinder from "./ScheduleFinder";
import { DirectionId } from "../../__v3api";
import {
  mapStateToProps,
  getCurrentState,
  storeHandler
} from "../store/ScheduleStore";
import { routeToModeName } from "../../helpers/css";
import currentLineSuspensions from "../../helpers/line-suspensions";
import { changeDirection } from "./schedule-finder/actions";

interface Props {
  schedulePageData: SchedulePageData;
  component: ComponentToRender;
  updateURL: (origin: SelectedOrigin, direction?: DirectionId) => void;
}

export const ScheduleLoader = ({
  component,
  schedulePageData,
  updateURL
}: Props): ReactElement<HTMLElement> => {
  // set direction. This can either come from a URL parameter or schedulePageData
  const initialDirectionFromURL = getParam("schedule_direction[direction_id]");
  if (initialDirectionFromURL) {
    storeHandler({
      type: "CHANGE_DIRECTION",
      newStoreValues: {
        selectedDirection: parseInt(initialDirectionFromURL, 10) as DirectionId
      }
    });
  }

  React.useEffect(() => {
    // get initial values from the store:
    const currentState = getCurrentState();
    const { selectedDirection, selectedOrigin } = currentState;
    let { modalOpen, modalMode } = currentState;
    const scheduleFinderDirection = getParam("schedule_finder[direction_id]");
    const scheduleFinderOrigin = getParam("schedule_finder[origin]");

    let newDirection: DirectionId | undefined;
    let newOrigin: SelectedOrigin | undefined;

    // modify the store values in case URL has parameters:
    if (scheduleFinderDirection) {
      newDirection = parseInt(scheduleFinderDirection, 10) as DirectionId;
    }
    if (scheduleFinderOrigin && scheduleFinderOrigin !== "") {
      newOrigin = scheduleFinderOrigin;
    }

    if (newDirection !== undefined && newOrigin) {
      modalMode = "schedule";
      modalOpen = true;
    }

    storeHandler({
      type: "INITIALIZE",
      newStoreValues: {
        selectedDirection: newDirection ?? selectedDirection,
        selectedOrigin: newOrigin ?? selectedOrigin,
        modalMode,
        modalOpen
      }
    });
    // we disable linting in this next line because we DO want to specify an empty array since we want this piece to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const currentState = getCurrentState();
  if (!!currentState && Object.keys(currentState).length !== 0) {
    const {
      selectedDirection: currentDirection,
      selectedOrigin,
      modalOpen,
      modalMode
    } = currentState;

    // check first if this is a unidirectional route:
    let readjustedDirectionId: DirectionId = currentDirection;
    if (
      !routeIsSuspended &&
      !Object.keys(routePatternsByDirection).includes(
        currentDirection.toString()
      )
    ) {
      // This route doesn't have this direction, so pick first existing direction
      readjustedDirectionId = parseInt(
        Object.keys(routePatternsByDirection)[0],
        10
      ) as DirectionId;
      changeDirection(readjustedDirectionId);
      updateURL(selectedOrigin, readjustedDirectionId);
    }

    const isFerryRoute = routeToModeName(route) === "ferry";

    if (component === "SCHEDULE_FINDER" && !isFerryRoute) {
      return (
        <ScheduleFinder
          updateURL={updateURL}
          route={route}
          stops={stops}
          services={services}
          routePatternsByDirection={routePatternsByDirection}
          today={today}
          scheduleNote={null}
          modalMode={modalMode}
          modalOpen={modalOpen}
          directionId={readjustedDirectionId}
          selectedOrigin={selectedOrigin}
        />
      );
    }

    if (component === "SCHEDULE_DIRECTION") {
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
            updateURL={updateURL}
            route={route}
            stops={stops}
            services={services}
            routePatternsByDirection={routePatternsByDirection}
            today={today}
            scheduleNote={null}
            modalMode={modalMode}
            modalOpen={modalOpen}
            directionId={readjustedDirectionId}
            selectedOrigin={selectedOrigin}
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
          directionId={readjustedDirectionId}
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
    }
  }
  return <></>;
};

export default connect(mapStateToProps)(ScheduleLoader);
