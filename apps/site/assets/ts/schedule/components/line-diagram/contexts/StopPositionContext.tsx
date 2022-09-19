import React, {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { LineDiagramStop } from "../../__schedule";
import {
  BASE_LINE_WIDTH,
  BRANCH_SPACING,
  StopCoord
} from "../graphics/graphic-helpers";
import { isMergeStop } from "../line-diagram-helpers";

type refType = HTMLElement | null;
export interface StopCoordState {
  [k: string]: StopCoord | null;
}
interface ContextValues {
  stopCoordState: StopCoordState;
  resetAllCoordinates: () => void;
  stopRefMap: Map<string, refType>;
}

/**
 * Computes pixel coordinates for a line diagram stop bubble
 * May be null if the stop is hidden on a collapsed branch
 */
function calcCoordinates(
  el: HTMLElement,
  stop: LineDiagramStop
): StopCoord | null {
  // x usually just a function of stop_data length
  const x = isMergeStop(stop)
    ? BASE_LINE_WIDTH + 1
    : BRANCH_SPACING * (stop.stop_data.length - 1) + BASE_LINE_WIDTH + 1;
  // y should align with the ref position
  const { offsetTop, offsetHeight } = el;
  const y = offsetTop + offsetHeight / 2;
  return x && y ? [x, y] : null;
}

/**
 * Sets up a ref for every stop,
 * sets up state to hold coordinate values,
 * sets up a function to update coordinates based on the refs.
 */
const useStopPositions = (stops: LineDiagramStop[]): ContextValues => {
  const map = new Map(
    stops.map<[string, refType]>(stop => [stop.route_stop.id, null])
  );
  const objEntries = stops.map<[string, StopCoord | null]>(stop => [
    stop.route_stop.id,
    null
  ]);
  const stopRefMap: MutableRefObject<Map<string, refType>> = useRef(map);
  const initialObject = Object.fromEntries(objEntries);
  const [stopCoordState, setStopCoordState] = useState<StopCoordState>(
    initialObject
  );

  const resetAllCoordinates = useCallback((): void => {
    window.requestAnimationFrame((): void => {
      // get new coordinates
      setStopCoordState(
        (state): StopCoordState => {
          const newState = { ...state };
          stops.forEach(stop => {
            const stopId = stop.route_stop.id;
            const el = stopRefMap.current.get(stopId);
            newState[stopId] = el ? calcCoordinates(el, stop) : null;
          });
          return newState;
        }
      );
    });
  }, [stops, stopRefMap]);

  // only update when the state actually changes (not every render)
  const contextValues = useMemo(
    () => ({
      stopCoordState,
      resetAllCoordinates,
      stopRefMap: stopRefMap.current
    }),
    [stopCoordState, resetAllCoordinates]
  );

  // Automatically update positions after resize events
  useLayoutEffect(() => {
    window.addEventListener("resize", resetAllCoordinates);
    return () => window.removeEventListener("resize", resetAllCoordinates);
  }, [resetAllCoordinates]);

  return contextValues;
};

/**
 * Sets up context that will hold:
 * stopCoordState: an object containing updated values for pixel location
 * resetAllCoordinates: a function to recalculate coordinates for every stop
 */
export const StopPositionContext = createContext<ContextValues>({
  stopCoordState: {},
  resetAllCoordinates: () => {},
  stopRefMap: new Map()
});

// Get latest coordinates for one or all stops
export function useStopPositionCoordinates(): StopCoordState | null;
export function useStopPositionCoordinates(stopId?: string): StopCoord;
export function useStopPositionCoordinates(
  stopId?: string
): StopCoordState | StopCoord | null {
  const { stopCoordState } = useContext(StopPositionContext);
  if (stopId) {
    return stopCoordState[stopId];
  }
  return stopCoordState;
}

// Triggers recalculation of all coordinates
export function useStopPositionReset(): () => void {
  const { resetAllCoordinates } = useContext(StopPositionContext);
  return resetAllCoordinates;
}

// Returns the set of refs being used to track <h4> stop names
export const useStopRefs = (): Map<string, refType> => {
  const { stopRefMap } = useContext(StopPositionContext);
  return stopRefMap;
};

/**
 * Access context values within child components via
 *  useStopPositionCoordinates(stopId?)
 *  useStopPositionReset()
 *  useStopPositionRefs()
 */
export const StopPositionProvider = ({
  stops,
  children
}: PropsWithChildren<{ stops: LineDiagramStop[] }>): React.ReactElement => {
  const contextValues = useStopPositions(stops);
  return (
    <StopPositionContext.Provider value={contextValues}>
      {children}
    </StopPositionContext.Provider>
  );
};
