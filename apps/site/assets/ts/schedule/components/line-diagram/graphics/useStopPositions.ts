import {
  createContext,
  useRef,
  useEffect,
  useCallback,
  useState,
  useLayoutEffect
} from "react";
import { LineDiagramStop } from "../../__schedule";
import { isMergeStop } from "../line-diagram-helpers";
import { BASE_LINE_WIDTH, BRANCH_SPACING, StopCoord } from "./graphic-helpers";

const xCoordForStop = (stop: LineDiagramStop): number => {
  if (isMergeStop(stop)) {
    return BASE_LINE_WIDTH + 1;
  }
  // usually just a function of stop_data length
  return BRANCH_SPACING * (stop.stop_data.length - 1) + BASE_LINE_WIDTH + 1;
};

type RefMapSetter = (stopId: string) => (el: HTMLElement | null) => void;
type RefMapUpdator = () => void;
type CoordGet = (stopId: string) => StopCoord | null;
export const StopRefContext = createContext<
  [RefMapSetter, RefMapUpdator, CoordGet]
>([() => () => {}, () => {}, () => null]);

export default function useStopPositions(
  stops: LineDiagramStop[]
): [RefMapSetter, RefMapUpdator, CoordGet] {
  const stopRefsMap = useRef(new Map());
  const initialCoordState = useRef<{
    [stopId: string]: StopCoord | null;
  }>({});

  // only if stops change!
  useEffect(() => {
    stops.forEach(stop => {
      const stopId = stop.route_stop.id;
      stopRefsMap.current.set(stopId, null);
      initialCoordState.current[stopId] = null;
    });
  }, [initialCoordState, stops]);

  const [stopCoordState, setStopCoordState] = useState(
    initialCoordState.current
  );

  const updateAllStops = useCallback(
    () =>
      window.requestAnimationFrame((): void => {
        setStopCoordState(state => {
          const newState = { ...state };
          stops.forEach(stop => {
            const stopId = stop.route_stop.id;
            const el = stopRefsMap.current.get(stopId);
            if (el) {
              const { offsetTop, offsetHeight } = el;
              const y = offsetTop + offsetHeight / 2;
              const x = xCoordForStop(stop);
              if (x && y) {
                newState[stopId] = [x, y];
              } else {
                newState[stopId] = null;
              }
            } else {
              newState[stopId] = null;
            }
          });
          return newState;
        });
      }),
    [stops]
  );

  useLayoutEffect(() => {
    window.addEventListener("resize", updateAllStops);
    return () => window.removeEventListener("resize", updateAllStops);
  }, [updateAllStops]);

  const setupStopRef: RefMapSetter = stopId => el => {
    stopRefsMap.current.set(stopId, el);
  };

  const getCoord: CoordGet = stopId => stopCoordState[stopId];

  return [setupStopRef, updateAllStops, getCoord];
}
