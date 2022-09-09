import React, { ReactElement } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route } from "../../../__v3api";
import {
  SimpleStopMap,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType
} from "../__schedule";
import Modal from "../../../components/Modal";
import OriginModalContent from "./OriginModalContent";
import ScheduleModalContent from "./ScheduleModalContent";
import {
  closeModal,
  getDirection,
  getModalMode,
  getOrigin
} from "../../store/schedule-store";

interface Props {
  route: Route;
  routePatternsByDirection: RoutePatternsByDirection;
  scheduleNote: ScheduleNoteType | null;
  services: ServiceInSelector[];
  stops: SimpleStopMap;
  today: string;
}

const ScheduleFinderModal = ({
  route,
  routePatternsByDirection,
  scheduleNote,
  services,
  stops,
  today
}: Props): ReactElement => {
  const initialMode = useSelector(getModalMode);
  const initialDirection = useSelector(getDirection);
  const initialOrigin = useSelector(getOrigin);
  const scheduleDispatch = useDispatch();
  const originStop = stops[initialDirection].find(
    stop => stop.id === initialOrigin
  );

  return (
    <Modal
      focusElementId={
        initialMode === "origin" ? "origin-filter" : "modal-close"
      }
      ariaLabel={{
        label:
          initialMode === "origin"
            ? "Choose Origin Stop"
            : `Schedules on the ${route.name} ${
                route.direction_names[initialDirection]
              } to ${route.direction_destinations[initialDirection]}${
                originStop ? ` from ${originStop.name}` : ""
              }`
      }}
      className={
        initialMode === "origin" ? "schedule-finder__origin-modal" : ""
      }
      closeModal={() => {
        scheduleDispatch(closeModal());
      }}
    >
      {initialMode === "origin" && (
        <OriginModalContent stops={stops[initialDirection] || []} />
      )}
      {initialMode === "schedule" && initialOrigin !== null && (
        <ScheduleModalContent
          route={route}
          routePatternsByDirection={routePatternsByDirection}
          scheduleNote={scheduleNote}
          services={services}
          stops={stops}
          today={today}
        />
      )}
    </Modal>
  );
};

export default ScheduleFinderModal;
