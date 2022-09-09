import { AnyAction, Dispatch, MiddlewareAPI } from "redux";
import {
  initializeStateFromUrl,
  scheduleStoreReducer,
  StoreProps,
  getOrigin,
  getPageDirection,
  getDirection,
  getModalMode,
  getModalOpen,
  closeModal,
  StoreAction,
  syncURLMiddleware,
  changeScheduleFinderDirection
} from "../schedule-store";

const initialState: StoreProps = {
  selectedDirection: 0,
  scheduleFinderDirection: null,
  scheduleFinderOrigin: null,
  modalOpen: false,
  modalMode: "schedule"
};

Object.defineProperty(window.location, "get", {
  configurable: true
});
const mockURL = (search: string): void => {
  jest.spyOn(window, "location", "get").mockReturnValue({
    search: search
  } as typeof window.location);
};

describe("initializeStateFromUrl", () => {
  afterEach(() => {
    mockURL("");
  });

  test("initializes state", () => {
    mockURL("?schedule_direction[direction_id]=1");

    const newState = initializeStateFromUrl(initialState);
    expect(newState.selectedDirection).toEqual(1);
    expect(newState.scheduleFinderDirection).toEqual(null);
    expect(newState.scheduleFinderOrigin).toEqual(null);
  });

  test("adjusts state using URL", () => {
    mockURL(
      "?schedule_direction[direction_id]=1&schedule_finder[origin]=6570&schedule_finder[direction_id]=1"
    );

    const newState = initializeStateFromUrl(initialState);
    expect(newState.selectedDirection).toEqual(1);
    expect(newState.scheduleFinderDirection).toEqual(1);
    expect(newState.scheduleFinderOrigin).toEqual("6570");
  });

  test("opens modal if schedule finder origin and direction state are both present", () => {
    mockURL(
      "?schedule_direction[direction_id]=1&schedule_finder[origin]=6570&schedule_finder[direction_id]=1"
    );

    const newState = initializeStateFromUrl(initialState);
    expect(newState.modalMode).toEqual("schedule");
    expect(newState.modalOpen).toEqual(true);
  });

  describe("only adjusts schedule finder origin and direction state if both present in URL", () => {
    test("no origin", () => {
      mockURL(
        "?schedule_direction[direction_id]=1&schedule_finder[direction_id]=1"
      );

      const newState = initializeStateFromUrl(initialState);
      expect(newState.scheduleFinderOrigin).toEqual(null);
      expect(newState.scheduleFinderDirection).toEqual(null);
    });

    test("no direction", () => {
      mockURL("?schedule_finder[origin]=9");

      const newState = initializeStateFromUrl(initialState);
      expect(newState.scheduleFinderOrigin).toEqual(null);
      expect(newState.scheduleFinderDirection).toEqual(null);
    });
  });
});

describe("scheduleStoreReducer", () => {
  test("handles initializing action", () => {
    expect(scheduleStoreReducer(undefined, { type: "INITIALIZE" })).toEqual({
      modalMode: "schedule",
      modalOpen: false,
      scheduleFinderDirection: null,
      scheduleFinderOrigin: null,
      selectedDirection: 0
    });
    expect(scheduleStoreReducer(initialState, { type: "INITIALIZE" })).toEqual(
      initialState
    );
  });

  test("initializing action handles URL params", () => {
    mockURL(
      "?schedule_direction[direction_id]=1&schedule_finder[origin]=6570&schedule_finder[direction_id]=1"
    );
    const newState = scheduleStoreReducer(initialState, { type: "INITIALIZE" });
    expect(newState).not.toEqual(initialState);
    expect(newState.selectedDirection).toEqual(1);
    expect(newState.scheduleFinderDirection).toEqual(1);
    expect(newState.scheduleFinderOrigin).toEqual("6570");
    mockURL("");
  });

  test("handles changing page direction", () => {
    const newState = scheduleStoreReducer(initialState, {
      type: "CHANGE_DIRECTION",
      payload: { selectedDirection: 1 }
    });
    expect(newState.selectedDirection).toEqual(1);
    expect(newState.scheduleFinderDirection).toEqual(1);
  });

  test("handles changing schedule finder direction", () => {
    const newState = scheduleStoreReducer(initialState, {
      type: "CHANGE_SF_DIRECTION",
      payload: { scheduleFinderDirection: 1 }
    });
    expect(newState.selectedDirection).toEqual(0);
    expect(newState.scheduleFinderDirection).toEqual(1);
  });

  test("handles changing schedule finder direction with open modal", () => {
    const newState = scheduleStoreReducer(
      {
        selectedDirection: 0,
        scheduleFinderDirection: 0,
        scheduleFinderOrigin: "20",
        modalOpen: true,
        modalMode: "schedule"
      },
      {
        type: "CHANGE_SF_DIRECTION",
        payload: { scheduleFinderDirection: 1 }
      }
    );
    expect(newState.selectedDirection).toEqual(0);
    expect(newState.scheduleFinderDirection).toEqual(1);
    expect(newState.scheduleFinderOrigin).toEqual(null);
    expect(newState.modalOpen).toEqual(true);
    expect(newState.modalMode).toEqual("origin");
  });

  test("handles changing schedule finder origin", () => {
    const newState = scheduleStoreReducer(initialState, {
      type: "CHANGE_SF_ORIGIN",
      payload: { scheduleFinderOrigin: "11" }
    });
    expect(newState.scheduleFinderOrigin).toEqual("11");
  });

  test("handles closing modal", () => {
    const newState = scheduleStoreReducer(initialState, {
      type: "CLOSE_MODAL"
    });
    expect(newState.modalOpen).toEqual(false);
  });

  test("handles opening modal", () => {
    const newState = scheduleStoreReducer(initialState, {
      type: "OPEN_MODAL",
      payload: { modalMode: "origin" }
    });
    expect(newState.modalOpen).toEqual(true);
    expect(newState.modalMode).toEqual("origin");
  });
});

test("selectors", () => {
  const testState: StoreProps = {
    selectedDirection: 1,
    scheduleFinderDirection: 0,
    scheduleFinderOrigin: "1234",
    modalMode: "origin",
    modalOpen: true
  };
  expect(getOrigin(testState)).toEqual("1234");
  expect(getPageDirection(testState)).toEqual(1);
  expect(getDirection(testState)).toEqual(0);
  expect(getDirection({ ...testState, scheduleFinderDirection: null })).toEqual(
    1
  );
  expect(getModalMode(testState)).toEqual("origin");
  expect(getModalOpen(testState)).toEqual(true);
});

test("calls middleware", () => {
  const middlewareSpy = jest.spyOn(
    require("../schedule-store"),
    "syncURLMiddleware"
  );
  const updateParamsSpy = jest.spyOn(
    require("../../../helpers/use-params"),
    "updateParams"
  );

  const create = () => {
    const store: MiddlewareAPI<Dispatch<AnyAction>, StoreProps> = {
      getState: jest.fn(() => ({} as StoreProps)),
      dispatch: jest.fn()
    };
    const next = jest.fn();
    const invoke = (action: StoreAction) =>
      syncURLMiddleware(store)(next)(action);
    return { next, invoke };
  };

  const { next, invoke } = create();
  const action = changeScheduleFinderDirection(1);
  invoke(action);
  expect(next).toHaveBeenCalledWith(action);
  expect(middlewareSpy).toHaveBeenCalled();
  expect(updateParamsSpy).toHaveBeenCalledWith({
    "schedule_finder[direction_id]": "1"
  });
});
