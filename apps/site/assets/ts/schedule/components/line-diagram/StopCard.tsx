import React, { ReactElement, Reducer, useContext } from "react";
import { effectNameForAlert } from "../../../components/Alerts";
import GlxOpen from "../../../components/GlxOpen";
import MatchHighlight from "../../../components/MatchHighlight";
import { alertIcon } from "../../../helpers/icon";
import {
  hasBranches,
  isEndNode,
  isStartNode,
  stopForId
} from "../../../helpers/stop-tree";
import {
  alertsByStop,
  isActiveDiversion,
  isHighSeverityOrHighPriority
} from "../../../models/alert";
import { hasPredictionTime } from "../../../models/prediction";
import {
  isACommuterRailRoute,
  isAGreenLineRoute,
  isSubwayRoute
} from "../../../models/route";
import { Alert, DirectionId, Route } from "../../../__v3api";
import { RouteStop, RouteStopRoute, StopId, StopTree } from "../__schedule";
import { branchPosition, diagramWidth } from "./line-diagram-helpers";
import StopConnections from "./StopConnections";
import StopFeatures from "./StopFeatures";
import StopPredictions from "./StopPredictions";
import { StopRefContext } from "./LineDiagramWithStops";
import { LiveData } from "./__line-diagram";
import useChannel from "../../../hooks/useChannel";
import { SocketEvent } from "../../../app/channels";

interface Props {
  stopTree: StopTree;
  stopId: StopId;
  alerts: Alert[];
  onClick: (stop: RouteStop) => void;
  liveData?: LiveData;
  searchQuery?: string;
}

const width = (stopTree: StopTree, stopId: StopId): number =>
  diagramWidth(branchPosition(stopTree, stopId));

const hasBranchLabel = (stopTree: StopTree, stopId: StopId): boolean => {
  const stop: RouteStop = stopForId(stopTree, stopId);
  return (
    hasBranches(stopTree) &&
    (isStartNode(stopTree, stopId) || isEndNode(stopTree, stopId)) &&
    !!stop.branch &&
    !!stop.route
  );
};

const lineName = ({ name, route: routeStopRoute }: RouteStop): string => {
  const route = routeStopRoute as Route;
  const title = isAGreenLineRoute(route)
    ? `Green Line ${route.id.split("-")[1]}`
    : name;
  const lineOrBranch = isACommuterRailRoute(route) ? "Line" : "Branch";
  return `${title} ${lineOrBranch}`;
};

const hasLivePredictions = (liveData?: LiveData): boolean =>
  !!liveData && liveData.headsigns.some(hasPredictionTime);
const showPrediction = (
  stopTree: StopTree,
  stopId: StopId,
  liveData?: LiveData
): boolean => hasLivePredictions(liveData) && !isEndNode(stopTree, stopId);

const byRouteId = (a: Route, b: Route): number => (a.id < b.id ? -1 : 1);

const connectionsFor = (
  routeStop: RouteStop,
  stopTree: StopTree
): RouteStopRoute[] => {
  const { connections } = routeStop;
  const greenLineConnections = connections.filter(isAGreenLineRoute);
  if (routeStop.route && hasBranches(stopTree) && greenLineConnections.length) {
    // If we can connect to other Green Line routes, they can connect back to
    // this route as well.
    const routeStopRoute: RouteStopRoute = {
      ...routeStop.route,
      "custom_route?": false
    };
    return [routeStopRoute, ...connections].sort(byRouteId);
  }
  return connections;
};

const hasHighPriorityAlert = (stopId: StopId, alerts: Alert[]): boolean =>
  alertsByStop(alerts, stopId).filter(isHighSeverityOrHighPriority).length > 0;

const routeForStop = (
  stopTree: StopTree,
  stopId: StopId
): RouteStopRoute | null => {
  const { route } = stopForId(stopTree, stopId);
  return route;
};

const hasUpcomingDeparturesIfSubway = (
  stopTree: StopTree,
  stopId: StopId,
  liveData?: LiveData
): boolean => {
  const route = routeForStop(stopTree, stopId);
  if (!route || !isSubwayRoute(route)) return true;
  return !!liveData && liveData.headsigns.length > 0;
};

const schedulesButtonLabel = (stopTree: StopTree, stopId: StopId): string => {
  const route = routeForStop(stopTree, stopId);
  return route && isSubwayRoute(route)
    ? "View upcoming departures"
    : "View schedule";
};

const Alert = (): JSX.Element => (
  <>
    {alertIcon("c-svg__icon-alerts-triangle")}
    <span className="sr-only">Service alert or delay</span>
    &nbsp;
  </>
);

type RouteId = string;

export interface Prediction {
  id: string;
  directionId: DirectionId;
  isDeparting: boolean;
  stopId: string;
  time: Date;
  track?: string;
  tripId: string;
}

interface StopData {
  id: string;
}

interface TripData {
  id: string;
}

interface PredictionData {
  id: string;
  "departing?": boolean;
  direction_id: DirectionId;
  stop: StopData;
  time: string;
  track?: string;
  trip: TripData;
}

const predictionFromData = (predictionData: PredictionData): Prediction => ({
  id: predictionData.id,
  directionId: predictionData.direction_id,
  isDeparting: predictionData["departing?"],
  stopId: predictionData.stop.id,
  //@ts-ignore
  time: new Date(predictionData.time),
  //@ts-ignore
  track: predictionData.track,
  tripId: predictionData.trip.id
});

///
interface PredictionData {
  predictions: Prediction[];
}

interface ParsedPrediction extends Prediction {}

interface PredictionState {
  predictions: Prediction[];
}

type PredictionAction = SocketEvent<PredictionData[]>;

// WELP. Because we set up the Prediction.Stream to process the Socket-type events (add, update, remove, etc), that means we don't need to deal with any of that HERE.
// The stream awesomely just gives us a bunch of predictions at once.
// BUT I have a feeling I'll have to re-do the useChannel hook typing maybe?
/**
 * Additional considerations for the new usePredictions hook, or maybe even for the socket?
 * - take a directionId argument, and filter incoming predictions by that?
 * - probably should sort by time by default
 * - take a numResults argument to control how many predictions returned.
 * - MAYBE the usePredictionsChannel should be called as usePredictionsChannel(routeId, stopId) and then the hook is responible for composing the proper name. yeah that seems better.
 */
const predictionsReducer: Reducer<PredictionState, PredictionAction> = (
  oldPredictions,
  newPredictions
) => {
  //@ts-expect-error
  const parsedPredictions = newPredictions.predictions.map(predictionFromData);
  return { predictions: parsedPredictions };
};

const usePredictionsChannel = (channel: string): ParsedPrediction[] => {
  const { predictions } = useChannel<
    PredictionData,
    PredictionState,
    PredictionAction
  >(channel, predictionsReducer, { predictions: [] });
  console.log("parsed predictions", predictions);
  return predictions;
};

const NewStopPredictions = ({
  channel
}: {
  channel: string;
}): ReactElement<HTMLElement> => {
  const predictions = usePredictionsChannel(channel);
  // console.log(predictions);
  return <div>Hi</div>;
};

const StopCard = ({
  stopTree,
  stopId,
  alerts,
  onClick,
  liveData,
  searchQuery
}: Props): ReactElement<HTMLElement> => {
  const refs = useContext(StopRefContext)[0];
  const routeStop: RouteStop = stopForId(stopTree, stopId);

  const diversionAlert = alerts.find(isActiveDiversion);
  const showDiversion =
    diversionAlert &&
    !(hasLivePredictions(liveData) && isEndNode(stopTree, stopId));

  return (
    <li
      className="m-schedule-diagram__stop"
      style={{
        paddingLeft: searchQuery ? "0.5rem" : `${width(stopTree, stopId)}px`
      }}
    >
      <section className="m-schedule-diagram__content">
        <GlxOpen pageType="line-diagram" stopId={stopId} />
        {hasBranchLabel(stopTree, stopId) && (
          <div className="u-bold u-small-caps">{lineName(routeStop)}</div>
        )}
        <header
          className="m-schedule-diagram__stop-heading"
          ref={el => refs.set(stopId, el)}
        >
          <h4 className="m-schedule-diagram__stop-link notranslate">
            <a href={`/stops/${stopId}`}>
              {hasHighPriorityAlert(stopId, alerts) && <Alert />}
              <MatchHighlight text={routeStop.name} matchQuery={searchQuery} />
            </a>
          </h4>
          {StopFeatures(routeStop)}
        </header>

        <div className="m-schedule-diagram__stop-details">
          {StopConnections(stopId, connectionsFor(routeStop, stopTree))}
          {showPrediction(stopTree, stopId, liveData) ? (
            <StopPredictions
              headsigns={liveData!.headsigns}
              isCommuterRail={
                !!routeStop.route && isACommuterRailRoute(routeStop.route)
              }
            />
          ) : (
            showDiversion && (
              <div className="m-schedule-diagram__alert">
                {effectNameForAlert(diversionAlert!)}
              </div>
            )
          )}
          <NewStopPredictions
            channel={`predictions:${routeStop.route?.id}@${stopId}`}
          />
        </div>

        {!isEndNode(stopTree, stopId) &&
          hasUpcomingDeparturesIfSubway(stopTree, stopId, liveData) && (
            <footer className="m-schedule-diagram__footer">
              <button
                className="btn btn-link"
                type="button"
                onClick={() => onClick(routeStop)}
              >
                {schedulesButtonLabel(stopTree, stopId)}
              </button>
            </footer>
          )}
      </section>
    </li>
  );
};

export default StopCard;
