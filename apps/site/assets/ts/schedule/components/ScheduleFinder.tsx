import React, { ReactElement } from "react";
import { Route, DirectionId } from "../../__v3api";
import {
  SimpleStopMap,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType,
  SelectedOrigin
} from "./__schedule";
import ScheduleFinderForm from "./schedule-finder/ScheduleFinderForm";
import ScheduleFinderModal, {
  Mode as ModalMode
} from "./schedule-finder/ScheduleFinderModal";
import { getCurrentState, storeHandler } from "../store/ScheduleStore";
import { routeToModeName } from "../../helpers/css";
import {
  changeDirection,
  changeOrigin,
  closeModal
} from "./schedule-finder/actions";

interface Props {
  updateURL: (origin: SelectedOrigin, direction?: DirectionId) => void;
  services: ServiceInSelector[];
  directionId: DirectionId;
  route: Route;
  stops: SimpleStopMap;
  routePatternsByDirection: RoutePatternsByDirection;
  today: string;
  scheduleNote: ScheduleNoteType | null;
  selectedOrigin: SelectedOrigin;
  modalMode: ModalMode;
  modalOpen: boolean;
}

const ScheduleFinder = ({
  updateURL,
  directionId,
  route,
  services,
  stops,
  routePatternsByDirection,
  today,
  scheduleNote,
  modalMode,
  selectedOrigin,
  modalOpen
}: Props): ReactElement<HTMLElement> => {
  const openScheduleModal = (): void => {
    const currentState = getCurrentState();
    const { modalOpen: modalIsOpen } = currentState;
    if (selectedOrigin !== undefined && !modalIsOpen) {
      storeHandler({
        type: "OPEN_MODAL",
        newStoreValues: {
          modalMode: "schedule"
        }
      });
    }
  };

  const isFerryRoute = routeToModeName(route) === "ferry";

  return (
    <div
      className={`${
        isFerryRoute ? "schedule-finder-vertical" : "schedule-finder"
      }`}
    >
      <ScheduleFinderForm
        onDirectionChange={changeDirection}
        onOriginChange={changeOrigin}
        onSubmit={openScheduleModal}
        route={route}
        selectedDirection={directionId}
        selectedOrigin={selectedOrigin}
        stopsByDirection={stops}
      />
      {modalOpen && (
        <ScheduleFinderModal
          closeModal={closeModal}
          initialMode={modalMode}
          initialDirection={directionId}
          initialOrigin={selectedOrigin}
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
};

export default ScheduleFinder;
