import {
  Reducer,
  createStore,
  Store,
  applyMiddleware,
  Middleware,
  compose
} from "redux";
import { SelectedOrigin } from "../components/__schedule";
import { DirectionId } from "../../__v3api";
import { getParam, updateParams } from "../../helpers/use-params";

type ModalMode = "schedule" | "origin";

export interface StoreProps {
  selectedDirection: DirectionId;
  scheduleFinderDirection: DirectionId | null;
  scheduleFinderOrigin: SelectedOrigin | null;
  modalOpen: boolean;
  modalMode: ModalMode;
}

// required modalMode, optional scheduleFinderOrigin
type OpenModalPayload = Partial<
  Pick<StoreProps, "modalMode" | "scheduleFinderOrigin">
> &
  Pick<StoreProps, "modalMode">;

export type StoreAction =
  | { type: "INITIALIZE" }
  | { type: "CLOSE_MODAL" }
  | { type: "OPEN_MODAL"; payload: OpenModalPayload }
  | {
      type: "CHANGE_SF_ORIGIN";
      payload: Pick<StoreProps, "scheduleFinderOrigin">;
    }
  | {
      type: "CHANGE_SF_DIRECTION";
      payload: Pick<StoreProps, "scheduleFinderDirection">;
    }
  | {
      type: "CHANGE_DIRECTION";
      payload: Pick<StoreProps, "selectedDirection">;
    };

const parseDirection = (dir: string): DirectionId =>
  parseInt(dir, 10) as DirectionId;

export const initializeStateFromUrl = (state: StoreProps): StoreProps => {
  const updatedState = { ...state };
  const initialDirection = getParam("schedule_direction[direction_id]");
  if (initialDirection) {
    updatedState.selectedDirection = parseDirection(initialDirection);
  }

  const initialScheduleFinderDirection = getParam(
    "schedule_finder[direction_id]"
  );
  const initialScheduleFinderOrigin = getParam("schedule_finder[origin]");
  if (initialScheduleFinderDirection && initialScheduleFinderOrigin) {
    updatedState.scheduleFinderDirection = parseDirection(
      initialScheduleFinderDirection
    );
    updatedState.scheduleFinderOrigin = initialScheduleFinderOrigin;
    // open modal!
    updatedState.modalMode = "schedule";
    updatedState.modalOpen = true;
  } else {
    updatedState.scheduleFinderDirection = null;
    updatedState.scheduleFinderOrigin = null;
  }

  return updatedState;
};

export const scheduleStoreReducer: Reducer<StoreProps, StoreAction> = (
  prevState: StoreProps | undefined = {
    selectedDirection: 0,
    scheduleFinderDirection: null,
    scheduleFinderOrigin: null,
    modalOpen: false,
    modalMode: "schedule"
  },
  action: StoreAction
): StoreProps => {
  if (!prevState) return {} as StoreProps;

  let newState = { ...prevState };

  switch (action.type) {
    case "INITIALIZE":
      newState = initializeStateFromUrl(newState);
      break;
    case "CHANGE_DIRECTION":
      newState.selectedDirection = action.payload.selectedDirection;
      // reset Schedule Finder direction
      newState.scheduleFinderDirection = action.payload.selectedDirection;
      break;
    case "CHANGE_SF_DIRECTION":
      // if modal is open, change to origin selection
      if (newState.modalOpen) {
        newState.scheduleFinderOrigin = null;
        newState.modalMode = "origin";
      }
      newState.scheduleFinderDirection = action.payload.scheduleFinderDirection;
      break;
    case "CHANGE_SF_ORIGIN":
      newState.scheduleFinderOrigin = action.payload.scheduleFinderOrigin;
      // reopen schedule modal
      newState.modalMode = "schedule";
      newState.modalOpen = true;
      break;
    case "OPEN_MODAL":
      newState.modalOpen = true;
      newState.modalMode = action.payload.modalMode;
      // set origin if specified
      if (action.payload.scheduleFinderOrigin) {
        newState.scheduleFinderOrigin = action.payload.scheduleFinderOrigin;
      }
      break;
    case "CLOSE_MODAL":
      newState.modalOpen = false;
      // reset Schedule Finder's direction selection to align with page
      newState.scheduleFinderDirection = newState.selectedDirection;
      break;
    default:
      break;
  }

  return newState;
};

/**
 * Actions
 */
export const closeModal = (): StoreAction => ({ type: "CLOSE_MODAL" });

export const changeScheduleFinderOrigin = (
  scheduleFinderOrigin: SelectedOrigin
): StoreAction => ({
  type: "CHANGE_SF_ORIGIN",
  payload: { scheduleFinderOrigin }
});

export const changeScheduleFinderDirection = (
  scheduleFinderDirection: DirectionId | null
): StoreAction => ({
  type: "CHANGE_SF_DIRECTION",
  payload: { scheduleFinderDirection }
});

export const openOriginModal = (): StoreAction => ({
  type: "OPEN_MODAL",
  payload: { modalMode: "origin" }
});
export const openScheduleModal = (): StoreAction => ({
  type: "OPEN_MODAL",
  payload: { modalMode: "schedule" }
});
export const openScheduleModalWithOrigin = (
  scheduleFinderOrigin: string | null
): StoreAction => ({
  type: "OPEN_MODAL",
  payload: { modalMode: "schedule", scheduleFinderOrigin }
});
export const resetDirection = (
  selectedDirection: DirectionId
): StoreAction => ({
  type: "CHANGE_DIRECTION",
  payload: { selectedDirection }
});

/**
 * Selectors
 */
export const getOrigin = (state: StoreProps): SelectedOrigin | null =>
  state.scheduleFinderOrigin;
export const getPageDirection = (state: StoreProps): DirectionId =>
  state.selectedDirection;
export const getDirection = (state: StoreProps): DirectionId => {
  if (state.scheduleFinderDirection === null) {
    return getPageDirection(state);
  }
  return state.scheduleFinderDirection;
};
export const getModalMode = (state: StoreProps): ModalMode => state.modalMode;
export const getModalOpen = (state: StoreProps): boolean => state.modalOpen;

/**
 * Middleware
 *
 * syncURLMiddleware: watches the state for changes that need to be reflected in
 * the URL parameters
 *
 */
export const syncURLMiddleware: Middleware<
  {},
  StoreProps
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = _store => next => action => {
  const result = next(action); // dispatch the action
  let paramsToUpdate: Record<string, string | null> = {};
  if (action.type === "CLOSE_MODAL") {
    paramsToUpdate = {
      "schedule_finder[direction_id]": null,
      "schedule_finder[origin]": null
    };
  } else if (action.type !== "INITIALIZE" && action.payload) {
    const payloadKeys = Object.keys(action.payload);
    if (payloadKeys.includes("selectedDirection")) {
      paramsToUpdate[
        "schedule_direction[direction_id]"
      ] = action.payload.selectedDirection.toString();
    }
    if (payloadKeys.includes("scheduleFinderDirection")) {
      paramsToUpdate[
        "schedule_finder[direction_id]"
      ] = action.payload.scheduleFinderDirection.toString();
    }
    if (payloadKeys.includes("scheduleFinderOrigin")) {
      paramsToUpdate["schedule_finder[origin]"] =
        action.payload.scheduleFinderOrigin;
    }
  }

  if (Object.keys(paramsToUpdate).length) {
    updateParams(paramsToUpdate);
  }

  return result;
};

const exposeStore = (reduxStore: Store): void => {
  /* istanbul ignore next */
  if (window.Cypress) window.store = reduxStore;
};

export const createScheduleStore = (directionId: DirectionId): Store => {
  const middleware = [
    applyMiddleware(syncURLMiddleware),
    /* eslint-disable no-underscore-dangle */
    /* istanbul ignore next */
    ...(window.__REDUX_DEVTOOLS_EXTENSION__
      ? /* istanbul ignore next */
        [window.__REDUX_DEVTOOLS_EXTENSION__()]
      : [])
    /* eslint-enable no-underscore-dangle */
  ];

  const store = createStore(
    scheduleStoreReducer,
    {
      selectedDirection: directionId,
      scheduleFinderDirection: directionId,
      scheduleFinderOrigin: null,
      modalOpen: false,
      modalMode: "schedule"
    } as StoreProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compose(...middleware) as any
  );
  exposeStore(store);
  return store;
};

export const mapStateToProps = (state: StoreProps): StoreProps => ({
  ...state
});

export default mapStateToProps;
