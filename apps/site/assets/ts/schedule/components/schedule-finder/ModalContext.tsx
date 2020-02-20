import React, {
  createContext,
  useReducer,
  ReactElement,
  useContext
} from "react";
import { SelectedDirection, SelectedOrigin } from "../__schedule";
import { ModalAction, ModalState, scheduleFinderReducer } from "./reducer";

// The context value is an object with state and dispatch keys, populated here
// with initial values
const ModalContext = createContext<{
  state: ModalState;
  dispatch: (action: ModalAction) => void;
}>({
  // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
  state: {} as ModalState,
  dispatch: () => {}
});

// This component wraps ModalContext.Provider while also managing the context
// state, thereby enabling interaction between any context consumer components
// and the context state
const ModalProvider = ({
  selectedDirection,
  selectedOrigin,
  modalId,
  children,
  insideModal = false
}: {
  selectedDirection: SelectedDirection;
  selectedOrigin: SelectedOrigin;
  modalId: string | null;
  children: JSX.Element;
  insideModal?: boolean;
}): ReactElement => {
  const initialState: ModalState = {
    directionError: false,
    originError: false,
    originSearch: "",
    modalOpen: false,
    modalId: null,
    selectedDirection: null,
    selectedOrigin: null,
    insideModal: false
  };
  const [state, dispatch] = useReducer(scheduleFinderReducer, {
    ...initialState,
    selectedDirection,
    selectedOrigin,
    modalId,
    insideModal
  });

  return (
    <ModalContext.Provider value={{ state, dispatch }}>
      {children}
    </ModalContext.Provider>
  );
};

// A hook for reading and interacting with the context state. Can be used in any
// component with a <ModalProvider> ancestor, will expose the current state and
// a dispatch function that will handle actions via scheduleFinderReducer()
function useModalContext(): {
  state: ModalState;
  dispatch: (action: ModalAction) => void;
} {
  const { state, dispatch } = useContext(ModalContext);
  if (state === undefined || dispatch === undefined) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return { state, dispatch };
}

export { ModalContext, ModalProvider, useModalContext };
