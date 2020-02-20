import React, { ReactElement } from "react";
import { Route, DirectionId } from "../../__v3api";
import {
  SimpleStop,
  SimpleStopMap,
  RoutePatternsByDirection,
  ServiceInSelector,
  ScheduleNote as ScheduleNoteType,
  SelectedDirection,
  SelectedOrigin
} from "./__schedule";
import { handleReactEnterKeyPress } from "../../helpers/keyboard-events";
import icon from "../../../static/images/icon-schedule-finder.svg";
import renderSvg from "../../helpers/render-svg";
import Modal from "../../components/Modal";
import SelectContainer from "./schedule-finder/SelectContainer";
import ErrorMessage from "./schedule-finder/ErrorMessage";
import OriginModalContent from "./schedule-finder/OriginModalContent";
import ScheduleModalContent from "./schedule-finder/ScheduleModalContent";
import { ModalProvider, useModalContext } from "./schedule-finder/ModalContext";
import { MODAL_ACTIONS } from "./schedule-finder/reducer";

interface Props {
  services: ServiceInSelector[];
  route: Route;
  stops: SimpleStopMap;
  routePatternsByDirection: RoutePatternsByDirection;
  today: string;
  scheduleNote: ScheduleNoteType | null;
}

const parseSelectedDirection = (value: string): SelectedDirection => {
  if (value === "0") return 0;
  return 1;
};

const ScheduleFinder = ({
  route,
  services,
  stops,
  routePatternsByDirection,
  today,
  scheduleNote
}: Props): ReactElement<HTMLElement> => {
  const {
    direction_destinations: directionDestinations,
    direction_names: directionNames
  } = route;

  const validDirections = ([0, 1] as DirectionId[]).filter(
    direction => directionNames[direction] !== null
  );

  const { state, dispatch } = useModalContext();

  const handleUpdateOriginSearch = (searchQuery: string): void => {
    if (state.originSearch !== searchQuery) {
      dispatch({
        type: MODAL_ACTIONS.updateOriginSearch,
        payload: searchQuery
      });
    }
  };

  const handleSubmitForm = (): void => {
    if (state.selectedDirection === null || state.selectedOrigin === null) {
      dispatch({
        type: MODAL_ACTIONS.setErrors,
        payload: {
          directionError: state.selectedDirection === null,
          originError: state.selectedOrigin === null
        }
      });
      return; // don't open schedules modal
    }

    dispatch({ type: MODAL_ACTIONS.openModal, payload: "schedule-sf" });
  };

  const handleChangeOrigin = (origin: SelectedOrigin): void => {
    dispatch({ type: MODAL_ACTIONS.selectOrigin, payload: origin });
  };

  const handleOriginSelectClick = (): void => {
    if (state.selectedDirection === null) {
      dispatch({
        type: MODAL_ACTIONS.setErrors,
        payload: {
          directionError: state.selectedDirection === null
        }
      });
      return; // don't open origin modal
    }

    dispatch({ type: MODAL_ACTIONS.openModal, payload: "origin" });
  };

  return (
    <div className="schedule-finder">
      <h2 className="h3 schedule-finder__heading">
        {renderSvg("c-svg__icon", icon)} Schedule Finder
      </h2>
      <ErrorMessage
        directionError={state.directionError}
        originError={state.originError}
      />
      {!state.insideModal && (
        <div className="schedule-finder__helptext">
          Choose a stop to get schedule information and real-time departure
          predictions.
        </div>
      )}
      <div className="schedule-finder__modal-inputs">
        <div>
          <label
            className="schedule-finder__label"
            htmlFor="sf_direction_select"
          >
            Choose a direction
          </label>
          <SelectContainer
            error={state.directionError}
            id="sf_direction_select_container"
          >
            <select
              id="sf_direction_select"
              className="c-select-custom"
              value={
                state.selectedDirection !== null ? state.selectedDirection : ""
              }
              onChange={e => {
                dispatch({
                  type: MODAL_ACTIONS.selectDirection,
                  payload:
                    e.target.value === ""
                      ? null
                      : parseSelectedDirection(e.target.value)
                });
              }}
              onKeyUp={e =>
                handleReactEnterKeyPress(e, () => {
                  handleSubmitForm();
                })
              }
            >
              {!state.insideModal && <option value="">Select</option>}
              {validDirections.map(direction => (
                <option key={direction} value={direction}>
                  {directionNames[direction]!.toUpperCase()}{" "}
                  {directionDestinations[direction]!}
                </option>
              ))}
            </select>
          </SelectContainer>
        </div>
        <div>
          <label className="schedule-finder__label" htmlFor="sf_origin_select">
            Choose an origin stop
          </label>
          <SelectContainer
            error={state.originError}
            handleClick={handleOriginSelectClick}
            id="sf_origin_select_container"
          >
            <select
              id="sf_origin_select"
              className="c-select-custom c-select-custom--noclick"
              value={state.selectedOrigin || ""}
              onChange={e =>
                handleChangeOrigin(e.target.value ? e.target.value : null)
              }
              onKeyUp={e =>
                handleReactEnterKeyPress(e, () => {
                  handleSubmitForm();
                })
              }
            >
              <option value="">Select</option>
              {state.selectedDirection !== null
                ? stops[state.selectedDirection].map(
                    ({ id, name }: SimpleStop) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    )
                  )
                : null}
            </select>
          </SelectContainer>
        </div>
      </div>

      {(!state.insideModal ||
        (state.insideModal && state.modalId === "origin")) && (
        <Modal
          openState={state.modalOpen}
          focusElementId={
            state.modalId === "origin" ? "origin-filter" : "modal-close"
          }
          ariaLabel={{
            label:
              state.modalId === "origin"
                ? "Choose Origin Stop"
                : "Choose Schedule"
          }}
          className={
            state.modalId === "origin" ? "schedule-finder__origin-modal" : ""
          }
          closeModal={() => {
            dispatch({
              type: MODAL_ACTIONS.closeModal,
              payload: state.modalId === "origin" ? "origin" : ""
            });
          }}
        >
          {() => (
            <>
              {state.modalId === "origin" && (
                <OriginModalContent
                  selectedDirection={state.selectedDirection}
                  selectedOrigin={state.selectedOrigin}
                  originSearch={state.originSearch}
                  stops={stops[state.selectedDirection!] || []}
                  handleChangeOrigin={handleChangeOrigin}
                  handleUpdateOriginSearch={handleUpdateOriginSearch}
                  directionId={state.selectedDirection!}
                />
              )}
              {state.modalId !== "origin" && (
                <ModalProvider
                  insideModal
                  modalId="schedule-sf"
                  selectedDirection={state.selectedDirection}
                  selectedOrigin={state.selectedOrigin}
                >
                  <ScheduleModalContent
                    route={route}
                    services={services}
                    stops={stops}
                    routePatternsByDirection={routePatternsByDirection}
                    today={today}
                    scheduleNote={scheduleNote}
                  />
                </ModalProvider>
              )}
            </>
          )}
        </Modal>
      )}

      {!state.insideModal && (
        <div className="schedule-finder__button text-right">
          <input
            className="btn btn-primary"
            type="submit"
            value="Get schedules"
            onClick={handleSubmitForm}
          />
        </div>
      )}
    </div>
  );
};

export default ScheduleFinder;
