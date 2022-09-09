import React, { ReactElement } from "react";
import { useSelector } from "react-redux";
import { DirectionId, Route } from "../../../__v3api";
import { formattedDate, stringToDateObject } from "../../../helpers/date";
import { isInCurrentService } from "../../../helpers/service";
import { routeToModeName } from "../../../helpers/css";
import {
  SimpleStopMap,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType,
  UserInput
} from "../__schedule";
import { EnhancedJourney, Journey, TripInfo } from "../__trips";
import ScheduleNote from "../ScheduleNote";
import ScheduleFinderForm from "./ScheduleFinderForm";
import DailySchedule from "./daily-schedule/DailySchedule";
import UpcomingDepartures from "./upcoming-departures/UpcomingDepartures";
import { useProvider } from "../../../helpers/use-provider";
import {
  fetchJsonOrThrow,
  fetchJson,
  isFetchFailed
} from "../../../helpers/fetch-json";
import { useAwaitInterval } from "../../../helpers/use-await-interval";
import { getDirection, getOrigin } from "../../store/schedule-store";

// exported for testing
export const fetchData = async (
  routeId: string,
  selectedOrigin: string,
  selectedDirection: DirectionId,
  date: string
): Promise<EnhancedJourney[]> => {
  const departures = await fetchJsonOrThrow<Journey[]>(
    `/schedules/finder_api/departures?id=${routeId}&stop=${selectedOrigin}&direction=${selectedDirection}`
  );

  const enhanced = await Promise.all(
    departures.map(async departure => {
      const res = await fetchJson<TripInfo>(
        `/schedules/finder_api/trip?id=${departure.trip.id}&route=${routeId}&date=${date}&direction=${selectedDirection}&stop=${selectedOrigin}`
      );

      if (isFetchFailed(res)) {
        // 404s here are a known failure mode, see finder_api.ex#get_trip_info
        if (res.status !== 404) {
          throw new Error(
            `Failed to fetch trip information: ${res.status} ${res.statusText}`
          );
        }

        return { ...departure, tripInfo: null };
      }

      return { ...departure, tripInfo: res };
    })
  );

  return enhanced;
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
  const selectedDirection = useSelector(getDirection);
  const selectedOrigin = useSelector(getOrigin);
  const input: UserInput = {
    route: routeId,
    origin: selectedOrigin as string,
    date: today,
    direction: selectedDirection!
  };

  const [state, updateData] = useProvider(fetchData, [
    routeId,
    selectedOrigin as string,
    selectedDirection!,
    input.date
  ]);
  useAwaitInterval(updateData, 10000);

  const serviceToday = services.some(service =>
    isInCurrentService(service, stringToDateObject(today))
  );

  const renderUpcomingDepartures = (): ReactElement<HTMLElement> =>
    serviceToday ? (
      <UpcomingDepartures state={state} />
    ) : (
      <div className="callout text-center u-bold">
        There are no scheduled trips for {formattedDate(today)}.
      </div>
    );

  return (
    <>
      <div className="schedule-finder schedule-finder--modal">
        <ScheduleFinderForm route={route} stopsByDirection={stops} />
      </div>

      {routeToModeName(route) !== "ferry" && renderUpcomingDepartures()}

      {scheduleNote ? (
        <ScheduleNote
          className="m-schedule-page__schedule-notes--modal"
          scheduleNote={scheduleNote}
        />
      ) : (
        <DailySchedule
          stopId={selectedOrigin as string}
          services={services}
          routeId={routeId}
          directionId={selectedDirection!}
          routePatterns={routePatternsByDirection[selectedDirection!]}
          today={today}
        />
      )}
    </>
  );
};

export default ScheduleModalContent;
