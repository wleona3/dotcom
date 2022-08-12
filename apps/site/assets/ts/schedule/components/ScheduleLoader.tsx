import React, { ReactElement } from "react";
import { connect } from "react-redux";
import { useQueryParams, StringParam } from "use-query-params";
import ContentTeasers from "./ContentTeasers";
import UpcomingHolidays from "./UpcomingHolidays";
import AdditionalLineInfo from "./AdditionalLineInfo";
import ScheduleNote from "./ScheduleNote";
import ScheduleDirection from "./ScheduleDirection";
import {
  SchedulePageData,
  SelectedOrigin,
  ComponentToRender
} from "../components/__schedule";
import { MapData, StaticMapData } from "../../leaflet/components/__mapdata";
import ScheduleFinder from "./ScheduleFinder";
import ScheduleFinderModal from "./schedule-finder/ScheduleFinderModal";
import { DirectionId } from "../../__v3api";
import {
  mapStateToProps,
  getCurrentState,
  storeHandler
} from "../store/ScheduleStore";
import { routeToModeName } from "../../helpers/css";

interface Props {
  schedulePageData: SchedulePageData;
  component: ComponentToRender;
  updateURL: (origin: SelectedOrigin, direction?: DirectionId) => void;
}

export const changeOrigin = (origin: SelectedOrigin): void => {
  storeHandler({
    type: "CHANGE_ORIGIN",
    newStoreValues: {
      selectedOrigin: origin
    }
  });
  // reopen modal depending on choice:
  storeHandler({
    type: "OPEN_MODAL",
    newStoreValues: {
      modalMode: origin ? "schedule" : "origin"
    }
  });
};

export const ScheduleLoader = ({
  component,
  schedulePageData,
  updateURL
}: Props): ReactElement<HTMLElement> => {
  const [query] = useQueryParams({
    // eslint-disable-next-line camelcase
    "schedule_finder[direction_id]": StringParam,
    "schedule_finder[origin]": StringParam
  });

  const changeDirection = (direction: DirectionId): void => {
    storeHandler({
      type: "CHANGE_DIRECTION",
      newStoreValues: {
        selectedDirection: direction,
        selectedOrigin: null
      }
    });
  };

  const closeModal = (): void => {
    storeHandler({
      type: "CLOSE_MODAL",
      newStoreValues: {}
    });
    // clear parameters from URL when closing the modal:
    updateURL("");
  };

  React.useEffect(() => {
    // get initial values from the store:
    const currentState = getCurrentState();
    const { selectedDirection, selectedOrigin } = currentState;
    let { modalOpen, modalMode } = currentState;

    let newDirection: DirectionId | undefined;
    let newOrigin: SelectedOrigin | undefined;

    // modify the store values in case URL has parameters:
    if (query["schedule_finder[direction_id]"] !== undefined) {
      newDirection = query["schedule_finder[direction_id]"] === "0" ? 0 : 1;
    }
    if (query["schedule_finder[origin]"] !== undefined) {
      newOrigin = query["schedule_finder[origin]"];
    }

    if (newDirection !== undefined && newOrigin !== undefined) {
      modalMode = "schedule";
      modalOpen = true;
    }

    storeHandler({
      type: "INITIALIZE",
      newStoreValues: {
        selectedDirection: newDirection || selectedDirection,
        selectedOrigin: newOrigin || selectedOrigin,
        modalMode,
        modalOpen
      }
    });
    // we disable linting in this next line because we DO want to specify an empty array since we want this piece to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOriginSelectClick = (): void => {
    storeHandler({
      type: "OPEN_MODAL",
      newStoreValues: {
        modalMode: "origin"
      }
    });
  };

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

  const routeIsSuspended = Object.keys(routePatternsByDirection).length === 0;

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

    if (component === "ADDITIONAL_LINE_INFORMATION") {
      const {
        teasers,
        pdfs,
        connections,
        fares,
        fare_link: fareLink,
        hours,
        holidays
      } = schedulePageData;

      if (routeIsSuspended) {
        return (
          <>
            <ContentTeasers teasers={teasers} />
            <UpcomingHolidays holidays={holidays} />
          </>
        );
      }

      return (
        <AdditionalLineInfo
          teasers={teasers}
          pdfs={pdfs}
          connections={connections}
          fares={fares}
          fareLink={fareLink}
          route={route}
          hours={hours}
          holidays={holidays}
        />
      );
    }

    if (component === "SCHEDULE_NOTE" && scheduleNote) {
      return (
        <div className="c-cms__sidebar">
          <div className="c-paragraph c-paragraph--custom-html">
<h2>Building a Better T</h2><p>As part of our $8 billion, <a href="/cip">5-year capital investment plan</a>, we're renovating stations, modernizing fare collection systems, upgrading services for our buses, subways, and ferries, and improving the accessibility of the entire system.</p><p><a className="c-call-to-action" href="/projects">Learn more</a></p></div>
          {modalOpen && (
            <ScheduleFinderModal
              closeModal={closeModal}
              directionChanged={changeDirection}
              initialMode={modalMode}
              initialDirection={readjustedDirectionId}
              initialOrigin={selectedOrigin}
              handleOriginSelectClick={handleOriginSelectClick}
              originChanged={changeOrigin}
              route={route}
              routePatternsByDirection={routePatternsByDirection}
              scheduleNote={scheduleNote}
              services={services}
              stops={stops}
              today={today}
              updateURL={updateURL}
            />
          )}
        </div>
      );
    }

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
          changeDirection={changeDirection}
          selectedOrigin={selectedOrigin}
          changeOrigin={changeOrigin}
          closeModal={closeModal}
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
            changeDirection={changeDirection}
            selectedOrigin={selectedOrigin}
            changeOrigin={changeOrigin}
            closeModal={closeModal}
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
