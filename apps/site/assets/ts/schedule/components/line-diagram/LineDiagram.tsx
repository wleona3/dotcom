import React, { ReactElement } from "react";
import { Provider } from "react-redux";
import { updateInLocation } from "use-query-params";
import useSWR from "swr";
import useFilteredList from "../../../hooks/useFilteredList";
import SearchBox from "../../../components/SearchBox";
import { LineDiagramStop, SelectedOrigin, RouteStop } from "../__schedule";
import { DirectionId, Route } from "../../../__v3api";
import { createLineDiagramCoordStore } from "./graphics/graphic-helpers";
import { LiveDataByStop } from "./__line-diagram";
import StopCard from "./StopCard";
import LineDiagramWithStops from "./LineDiagramWithStops";
import { getCurrentState, storeHandler } from "../../store/ScheduleStore";
import { changeOrigin } from "../ScheduleLoader";

interface LineDiagramProps {
  lineDiagram: LineDiagramStop[];
  route: Route;
  directionId: DirectionId;
}

const stationsOrStops = (routeType: number): string =>
  [0, 1, 2].includes(routeType) ? "Stations" : "Stops";

const LineDiagramAndStopListPage = ({
  lineDiagram,
  route,
  directionId
}: LineDiagramProps): ReactElement<HTMLElement> | null => {
  // also track the location of text to align the diagram points to
  const lineDiagramCoordStore = createLineDiagramCoordStore(lineDiagram);

  const updateURL = (origin: SelectedOrigin, direction?: DirectionId): void => {
    if (window) {
      // eslint-disable-next-line camelcase
      const newQuery = {
        "schedule_finder[direction_id]":
          direction !== undefined ? direction.toString() : "",
        "schedule_finder[origin]": origin
      };
      const newLoc = updateInLocation(newQuery, window.location);
      // newLoc is not a true Location, so toString doesn't work
      window.history.replaceState({}, "", `${newLoc.pathname}${newLoc.search}`);
    }
  };

  const handleStopClick = (stop: RouteStop): void => {
    changeOrigin(stop.id);

    const currentState = getCurrentState();
    const { modalOpen: modalIsOpen } = currentState;

    updateURL(stop.id, directionId);

    if (currentState.selectedOrigin !== undefined && !modalIsOpen) {
      storeHandler({
        type: "OPEN_MODAL",
        newStoreValues: {
          modalMode: "schedule"
        }
      });
    }
  };

  /**
   * Provide a search box for filtering stops
   */
  const [stopQuery, setStopQuery, filteredStops] = useFilteredList(
    lineDiagram,
    "route_stop.name"
  );

  /**
   * Live data, including realtime vehicle locations and predictions
   * Available on all modes except ferry (route.type 4)
   */
  // const liveUrl =
  //   route.type !== 4
  //     ? `/schedules/line_api/realtime?id=${route.id}&direction_id=${directionId}`
  //     : "";
  // const { data: maybeLiveData } = useSWR(
  //   liveUrl,
  //   url => fetch(url).then(response => response.json()),
  //   { refreshInterval: 15000 }
  // );
  const liveData = {} as LiveDataByStop;
  // const liveData = (maybeLiveData || {}) as LiveDataByStop;

  /**
   * Putting it all together
   */
  return (
    <>
      <h3 className="m-schedule-diagram__heading">
        {stationsOrStops(route.type)}
      </h3>
      {/* <SearchBox
        id="stop-search"
        labelText={`Search for a ${stationsOrStops(route.type)
          .toLowerCase()
          .slice(0, -1)}`}
        onChange={setStopQuery}
        className="m-schedule-diagram__filter"
      /> */}
      {stopQuery !== "" ? (
        <ol className="m-schedule-diagram m-schedule-diagram--searched">
          {filteredStops.length ? (
            (filteredStops as LineDiagramStop[]).map(
              (stop: LineDiagramStop) => (
                <StopCard
                  key={stop.route_stop.id}
                  stop={stop}
                  onClick={handleStopClick}
                  liveData={liveData[stop.route_stop.id]}
                  searchQuery={stopQuery}
                />
              )
            )
          ) : (
            <div className="c-alert-item c-alert-item--low c-alert-item__top-text-container">
              No stops {route.direction_names[directionId]} to{" "}
              {route.direction_destinations[directionId]} matching{" "}
              <b className="u-highlight">{stopQuery}</b>. Try changing your
              direction or adjusting your search.
            </div>
          )}
        </ol>
      ) : (
        <Provider store={lineDiagramCoordStore}>
          <LineDiagramWithStops
            stops={lineDiagram}
            handleStopClick={handleStopClick}
            liveData={liveData}
          />
        </Provider>
      )}
    </>
  );
};

export default LineDiagramAndStopListPage;
