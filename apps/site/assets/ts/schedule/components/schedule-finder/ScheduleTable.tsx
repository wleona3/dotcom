import React, { ReactElement, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { EnhancedRoutePattern, SelectedStopId } from "../__schedule";
import { Journey } from "../__trips";
import TableRow from "./TableRow";
import { UserInput } from "../../components/__schedule";
import renderSvg from "../../../helpers/render-svg";
import { StoreProps } from "../../store/ScheduleStore";
import arrowIcon from "../../../../static/images/icon-down-arrow.svg";

interface Props {
  journeys: Journey[];
  routePatterns: EnhancedRoutePattern[];
  input: UserInput;
}

const isSchoolTrip = (
  routePatternsById: {
    [key: string]: EnhancedRoutePattern;
  },
  routePatternId: string
): boolean =>
  (
    (routePatternsById[routePatternId] &&
      routePatternsById[routePatternId].time_desc) ||
    ""
  ).match(/school/gi) !== null;

const ScheduleTable = ({
  journeys,
  routePatterns,
  input
}: Props): ReactElement<HTMLElement> => {
  const routePatternsById = routePatterns.reduce(
    (accumulator, routePattern) => ({
      ...accumulator,
      [routePattern.id]: routePattern
    }),
    {}
  ) as {
    [key: string]: EnhancedRoutePattern;
  };

  const dispatch = useDispatch();

  const selectedDestination: SelectedStopId = useSelector(
    (store: StoreProps) => store.selectedDestination
  );

  useEffect(
    () => {
      if (selectedDestination) {
        console.log("fetch arrivals from:", selectedDestination);
      }
    },
    [selectedDestination]
  );

  const firstTrip = journeys[0];
  const lastTrip = journeys.length > 1 ? journeys[journeys.length - 1] : null;

  const anySchoolTrips = Object.values(journeys).some(
    ({ trip: { route_pattern_id: routePatternId } }) =>
      isSchoolTrip(routePatternsById, routePatternId)
  );

  return (
    <>
      <div className="schedule-finder__first-last-trip">
        <div className="u-small-caps u-bold">First Trip</div>
        {firstTrip.departure.time}
        {lastTrip && (
          <>
            <div className="u-small-caps u-bold">Last Trip</div>
            {lastTrip.departure.time}
          </>
        )}
      </div>
      {anySchoolTrips && (
        <p className="text-center">
          <strong>S</strong> - Does NOT run on school vacation
        </p>
      )}
      <table className="schedule-table">
        <thead className="schedule-table__header">
          <tr>
            {anySchoolTrips && (
              <th scope="col" className="schedule-table__cell" />
            )}
            <th scope="col" className="schedule-table__cell">
              Departs
            </th>
            {firstTrip.route.type === 2 && (
              <th scope="col" className="schedule-table__cell">
                Train
              </th>
            )}
            <th scope="col" colSpan={2} className="schedule-table__cell">
              <span className="pull-left">Destination</span>
              <button
                type="button"
                className="schedule-table__button"
                onClick={() =>
                  dispatch({
                    type: "OPEN_MODAL",
                    newStoreValues: { modalMode: "destination" }
                  })
                }
              >
                <span>Compare arrivals</span>
                {renderSvg("c-svg__icon", arrowIcon)}
              </button>
            </th>
          </tr>
          {selectedDestination && (
            <tr className="schedule-table__arrivals-header">
              <td colSpan={3} className="schedule-table__cell text-right">
                <strong>Arriving at: </strong>
                <button
                  type="button"
                  className="schedule-table__button"
                  onClick={() =>
                    dispatch({
                      type: "CHANGE_DESTINATION",
                      newStoreValues: { selectedDestination: null }
                    })
                  }
                >
                  {selectedDestination}
                  <i aria-hidden="true" className="fa fa-fw fa-times-circle" />
                </button>
              </td>
            </tr>
          )}
        </thead>
        <tbody>
          {journeys.map((journey: Journey) => (
            <TableRow
              key={journey.trip.id}
              input={input}
              journey={journey}
              isSchoolTrip={isSchoolTrip(
                routePatternsById,
                journey.trip.route_pattern_id
              )}
              anySchoolTrips={anySchoolTrips}
            />
          ))}
        </tbody>
      </table>
    </>
  );
};

export default ScheduleTable;
