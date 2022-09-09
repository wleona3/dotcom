import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { isEmpty } from "lodash";
import { Store } from "redux";
import Map from "./components/Map";
import { SchedulePageData } from "./components/__schedule";
import { MapData } from "../leaflet/components/__mapdata";
import ScheduleLoader from "./components/ScheduleLoader";
import { createScheduleStore } from "./store/schedule-store";
import { isABusRoute } from "../models/route";
import currentLineSuspensions from "../helpers/line-suspensions";
import AdditionalLineInfo from "./components/AdditionalLineInfo";
import UpcomingHolidays from "./components/UpcomingHolidays";
import ContentTeasers from "./components/ContentTeasers";
import ScheduleNote from "./components/ScheduleNote";
import ScheduleFinder from "./components/ScheduleFinder";
import { routeToModeName } from "../helpers/css";

const renderMap = ({
  route_patterns: routePatternsByDirection,
  direction_id: directionId,
  route
}: SchedulePageData): void => {
  let routePatterns = routePatternsByDirection[directionId];
  if (!routePatterns) {
    // special case for unidirectional routes. if there's no route patterns
    // defined for the selected direction, just find any route pattern.
    [routePatterns] = Object.values(routePatternsByDirection);
  }
  const defaultRoutePattern = routePatterns.slice(0, 1)[0];
  const currentShapes = isABusRoute(route)
    ? [defaultRoutePattern.shape_id]
    : routePatterns.map(pattern => pattern.shape_id);
  const currentStops = defaultRoutePattern.stop_ids;
  const mapDataEl = document.getElementById("js-map-data");
  if (!mapDataEl) return;
  const channel = mapDataEl.getAttribute("data-channel-id");
  if (!channel) throw new Error("data-channel-id attribute not set");
  const mapEl = document.getElementById("map-root");
  if (!mapEl) throw new Error("cannot find #map-root");
  const mapData: MapData = JSON.parse(mapDataEl.innerHTML);
  ReactDOM.render(
    <Map
      data={mapData}
      channel={channel}
      currentShapes={currentShapes}
      currentStops={currentStops}
    />,
    mapEl
  );
};

export const renderAdditionalLineInformation = (
  schedulePageData: SchedulePageData,
  store: Store
): void => {
  const {
    route,
    route_patterns: routePatternsByDirection,
    schedule_note: scheduleNote,
    teasers,
    pdfs,
    connections,
    fares,
    fare_link: fareLink,
    hours,
    holidays,
    services,
    stops,
    today
  } = schedulePageData;

  const routeIsSuspended =
    Object.keys(routePatternsByDirection).length === 0 ||
    currentLineSuspensions(route.id);

  const additionalLineInfoComponents = routeIsSuspended ? (
    <>
      <ContentTeasers teasers={teasers} />
      <UpcomingHolidays holidays={holidays} />
    </>
  ) : (
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

  ReactDOM.render(
    additionalLineInfoComponents,
    document.getElementById("react-root")
  );

  // don't show Schedule Finder for subway
  if (scheduleNote && !routeIsSuspended) {
    // this should probably just be server rendered
    ReactDOM.render(
      <>
        <ScheduleNote
          className="m-schedule-page__schedule-notes--desktop"
          scheduleNote={scheduleNote}
        />
        {/* Extra ScheduleFinder here so modal shows on subway pages. maybe should move elsewhere */}
        <Provider store={store}>
          <ScheduleFinder
            route={route}
            stops={stops}
            services={services}
            routePatternsByDirection={routePatternsByDirection}
            today={today}
            scheduleNote={scheduleNote}
          />
        </Provider>
      </>,
      document.getElementById("react-schedule-note-root")
    );
  }

  const isFerryRoute = routeToModeName(route) === "ferry";

  if (!scheduleNote) {
    const scheduleFinderRoot = document.getElementById(
      "react-schedule-finder-root"
    );
    if (scheduleFinderRoot && !isFerryRoute) {
      ReactDOM.render(
        <Provider store={store}>
          <ScheduleFinder
            route={route}
            stops={stops}
            services={services}
            routePatternsByDirection={routePatternsByDirection}
            today={today}
            scheduleNote={null}
          />
        </Provider>,
        scheduleFinderRoot
      );
    }
  }
};

export const renderDirectionOrMap = (
  schedulePageData: SchedulePageData,
  store: Store
): void => {
  const root = document.getElementById("react-schedule-direction-root");
  if (!root) {
    renderMap(schedulePageData);
    return;
  }

  ReactDOM.render(
    <Provider store={store}>
      <ScheduleLoader schedulePageData={schedulePageData} />
    </Provider>,
    root
  );
};

const render = (): void => {
  const schedulePageDataEl = document.getElementById("js-schedule-page-data");
  if (!schedulePageDataEl) return;
  const schedulePageData = JSON.parse(
    schedulePageDataEl.innerHTML
  ) as SchedulePageData;
  const {
    direction_id: directionId,
    route_patterns: routePatterns
  } = schedulePageData;

  /**
   * Create redux store that will be used to manage selected direction, origin, etc
   */
  const store = createScheduleStore(directionId);
  renderAdditionalLineInformation(schedulePageData, store);

  if (!isEmpty(routePatterns)) {
    renderDirectionOrMap(schedulePageData, store);
  }
};

const onLoad = (): void => {
  render();
};

export default onLoad;
