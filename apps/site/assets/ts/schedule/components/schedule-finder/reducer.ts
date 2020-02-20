import { SelectedDirection, SelectedOrigin } from "../__schedule";

export enum MODAL_ACTIONS {
  openModal,
  closeModal,
  setDirectionError,
  updateOriginSearch,
  selectDirection,
  selectOrigin,
  setErrors
}

// All the actions that can be performed on the schedule finder modal state
export type ModalAction =
  | { type: MODAL_ACTIONS.openModal; payload: string }
  | { type: MODAL_ACTIONS.closeModal; payload: string }
  | { type: MODAL_ACTIONS.updateOriginSearch; payload: string }
  | { type: MODAL_ACTIONS.selectDirection; payload: SelectedDirection }
  | { type: MODAL_ACTIONS.selectOrigin; payload: SelectedOrigin }
  | {
      type: MODAL_ACTIONS.setErrors;
      payload: { directionError?: boolean; originError?: boolean };
    };

// The state object of the schedule finder modals. Identical to prior
// ScheduleFinder component state, with an extra property to indicate whether
// the component is invoked from inside a modal
export interface ModalState {
  directionError: boolean;
  modalId: string | null;
  modalOpen: boolean;
  originError: boolean;
  originSearch: string;
  selectedDirection: SelectedDirection;
  selectedOrigin: SelectedOrigin;
  insideModal: boolean;
}

// Reducer function returning a new state object to reflect changes prompted by
// the specified action type and associated payload
export const scheduleFinderReducer = (
  previousState: ModalState,
  action: ModalAction
): ModalState => {
  switch (action.type) {
    // Open the modal and assign modalId
    case MODAL_ACTIONS.openModal: {
      return {
        ...previousState,
        modalId: action.payload,
        modalOpen: true
      };
    }
    // Handle the origin search user input
    case MODAL_ACTIONS.updateOriginSearch: {
      return {
        ...previousState,
        originSearch: action.payload
      };
    }
    // Assign new selected direction and reset origin
    case MODAL_ACTIONS.selectDirection: {
      if (previousState.selectedDirection !== action.payload) {
        return {
          ...previousState,
          selectedDirection: action.payload,
          selectedOrigin: null,
          directionError: action.payload === null,
          originError: false,
          originSearch: ""
        };
      }

      return previousState;
    }
    // Assign new selected origin
    case MODAL_ACTIONS.selectOrigin: {
      if (action.payload === null) {
        return {
          ...previousState,
          selectedOrigin: action.payload,
          modalOpen: previousState.modalId === "origin",
          originError: true
        };
      }
      // Selecting origin stop should open schedule modal
      return {
        ...previousState,
        selectedOrigin: action.payload,
        modalOpen: previousState.modalId === "origin",
        modalId: "schedule-sf",
        originError: false
      };
    }
    // Assign error state(s) if present
    case MODAL_ACTIONS.setErrors: {
      if (action.payload) {
        return {
          ...previousState,
          ...action.payload
        };
      }
      return previousState;
    }
    // Close modal
    case MODAL_ACTIONS.closeModal: {
      // Closing origin modal should open schedule modal
      if (action.payload === "origin") {
        return {
          ...previousState,
          modalId: previousState.selectedOrigin ? "schedule-sf" : null,
          modalOpen: !!previousState.selectedOrigin
        };
      }
      return {
        ...previousState,
        modalId: null,
        modalOpen: false
      };
    }
    // Otherwise don't change state
    default: {
      return previousState;
    }
  }
};
