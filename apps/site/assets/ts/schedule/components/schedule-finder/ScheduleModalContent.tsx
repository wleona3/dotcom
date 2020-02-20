import React, { ReactElement, useReducer, useEffect } from "react";
import UpcomingDepartures from "./UpcomingDepartures";
import { Route } from "../../../__v3api";
import {
  StopPrediction,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType,
  SelectedDirection,
  SelectedOrigin,
  UserInput,
  SimpleStopMap
} from "../__schedule";
import { reducer } from "../../../helpers/fetch";
import ServiceSelector from "./ServiceSelector";
import ScheduleNote from "../ScheduleNote";
import ScheduleFinder from "../ScheduleFinder";
import {
  ModalProvider,
  useModalContext
} from "./../schedule-finder/ModalContext";
import { MODAL_ACTIONS } from "./../schedule-finder/reducer";

type fetchAction =
  | { type: "FETCH_COMPLETE"; payload: StopPrediction[] }
  | { type: "FETCH_ERROR" }
  | { type: "FETCH_STARTED" };

export const fetchData = (
  routeId: string,
  selectedOrigin: SelectedOrigin,
  selectedDirection: SelectedDirection,
  dispatch: (action: fetchAction) => void
): Promise<void> => {
  dispatch({ type: "FETCH_STARTED" });
  return (
    window.fetch &&
    window
      .fetch(
        `/schedules/finder_api/departures?id=${routeId}&stop=${selectedOrigin}&direction=${selectedDirection}`
      )
      .then(response => {
        if (response.ok) return response.json();
        throw new Error(response.statusText);
      })
      .then(json => dispatch({ type: "FETCH_COMPLETE", payload: json }))
      // @ts-ignore
      .catch(() => dispatch({ type: "FETCH_ERROR" }))
  );
};

interface Props {
  route: Route;
  services: ServiceInSelector[];
  stops: SimpleStopMap;
  routePatternsByDirection: RoutePatternsByDirection;
  today: string;
  scheduleNote: ScheduleNoteType | null;
}

const ScheduleModalContent = ({
  route,
  services,
  stops,
  routePatternsByDirection,
  today,
  scheduleNote
}: Props): ReactElement<HTMLElement> | null => {
  const { id: routeId } = route;
  const [state, dispatch] = useReducer(reducer, {
    data: null,
    isLoading: true,
    error: false
  });
  const { state: modalState } = useModalContext();
  const { selectedDirection, selectedOrigin } = modalState;
  const hasOriginAndDirection =
    selectedOrigin !== null && selectedDirection !== null;

  useEffect(
    () => {
      if (hasOriginAndDirection) {
        fetchData(routeId, selectedOrigin, selectedDirection, dispatch);
      }
    },
    [routeId, selectedDirection, selectedOrigin]
  );

  const input: UserInput = {
    route: routeId,
    origin: selectedOrigin!,
    date: today,
    direction: selectedDirection
  };

  return (
    <>
      <ScheduleFinder
        route={route} // don't show for subway
        services={services}
        stops={stops}
        routePatternsByDirection={routePatternsByDirection}
        today={today}
        scheduleNote={scheduleNote}
      />
      {hasOriginAndDirection ? (
        <>
          <UpcomingDepartures state={state} input={input} />
          {scheduleNote ? (
            <ScheduleNote
              className="m-schedule-page__schedule-notes--modal"
              scheduleNote={scheduleNote}
            />
          ) : (
            <ServiceSelector
              services={services}
              routeId={routeId}
              routePatterns={routePatternsByDirection[selectedDirection!]}
              today={today}
            />
          )}
        </>
      ) : null}
    </>
  );
};

export default ScheduleModalContent;
