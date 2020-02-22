import React, { ReactElement } from "react";
import { SchedulePageData } from "./__schedule";
import PDFSchedules from "./PDFSchedules";
import Connections from "./Connections";
import ContentTeasers from "./ContentTeasers";
import HoursOfOperation from "./HoursOfOperation";
import Fares from "./Fares";
import UpcomingHolidays from "./UpcomingHolidays";
import ScheduleNote from "./ScheduleNote";
import ScheduleFinder from "./ScheduleFinder";
import { ModalProvider } from "./schedule-finder/ModalContext";

interface Props {
  schedulePageData: SchedulePageData;
}

const SchedulePage = ({
  schedulePageData: {
    connections,
    pdfs,
    teasers,
    hours,
    fares,
    holidays,
    fare_link: fareLink,
    route,
    schedule_note: scheduleNote,
    services,
    stops,
    route_patterns: routePatternsByDirection,
    today
  }
}: Props): ReactElement<HTMLElement> => (
  <>
    {scheduleNote ? (
      <ScheduleNote
        className="m-schedule-page__schedule-notes--desktop"
        scheduleNote={scheduleNote}
      />
    ) : (
      <ModalProvider
        modalId="schedule-sf"
        selectedDirection={null}
        selectedOrigin={null}
      >
        <ScheduleFinder
          route={route} // don't show for subway
          services={services}
          stops={stops}
          routePatternsByDirection={routePatternsByDirection}
          today={today}
          scheduleNote={null}
        />
      </ModalProvider>
    )}
    <ContentTeasers teasers={teasers} />
    <PDFSchedules pdfs={pdfs} />
    <Connections connections={connections} />
    <Fares fares={fares} fareLink={fareLink} routeType={route.type} />
    <HoursOfOperation hours={hours} />
    <UpcomingHolidays holidays={holidays} />
  </>
);
export default SchedulePage;
