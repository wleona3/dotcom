import React, { ReactElement } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { Route } from "../../__v3api";
import {
  SimpleStopMap,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType
} from "./__schedule";
import ScheduleFinderForm from "./schedule-finder/ScheduleFinderForm";
import ScheduleFinderModal from "./schedule-finder/ScheduleFinderModal";
import mapStateToProps, {
  getModalOpen,
  openScheduleModal
} from "../store/schedule-store";
import { routeToModeName } from "../../helpers/css";

interface Props {
  services: ServiceInSelector[];
  route: Route;
  stops: SimpleStopMap;
  routePatternsByDirection: RoutePatternsByDirection;
  today: string;
  scheduleNote: ScheduleNoteType | null;
}

const ScheduleFinder = (props: Props): ReactElement<HTMLElement> => {
  const { route, stops, scheduleNote } = props;
  const scheduleDispatch = useDispatch();
  const isFerryRoute = routeToModeName(route) === "ferry";
  const modalOpen = useSelector(getModalOpen);

  return (
    <div
      className={`${
        isFerryRoute ? "schedule-finder-vertical" : "schedule-finder"
      }`}
    >
      {!scheduleNote && (
        <ScheduleFinderForm
          onSubmit={(): void => {
            scheduleDispatch(openScheduleModal());
          }}
          route={route}
          stopsByDirection={stops}
        />
      )}
      {modalOpen && <ScheduleFinderModal {...props} />}
    </div>
  );
};

export default connect(mapStateToProps)(ScheduleFinder);
