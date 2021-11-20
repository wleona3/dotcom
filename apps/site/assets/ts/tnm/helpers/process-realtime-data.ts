import dotProp from "dot-prop-immutable";
import {
  RouteWithStopsWithDirections,
  Stop,
  EnhancedRoute
} from "../../__v3api";
import {
  RealtimeScheduleData,
  StopWithRoutes,
  DistanceByStopId,
  HeadsignDataByHeadsign
} from "../components/__tnm";

const findRoute = (
  data: RouteWithStopsWithDirections[],
  routeId: string
): [string, number] => {
  const index = data.findIndex(({ route }) => route.id === routeId);
  return index === -1 ? ["add", data.length] : ["update", index];
};

const findStop = (
  data: RouteWithStopsWithDirections[],
  routeIndex: number,
  stopId: string
): [string, number] => {
  const index = data[routeIndex].stops_with_directions.findIndex(
    ({ stop }) => stop.id === stopId
  );
  return index === -1
    ? ["add", data[routeIndex].stops_with_directions.length]
    : ["update", index];
};

const setRoute = (
  data: RouteWithStopsWithDirections[],
  index: number,
  route: EnhancedRoute
): RouteWithStopsWithDirections[] =>
  dotProp.set(
    dotProp.set(data, `${index}.route`, route),
    `${index}.stops_with_directions`,
    []
  );

const setStop = (
  data: RouteWithStopsWithDirections[],
  routeIndex: number,
  index: number,
  stop: Stop,
  distance: string
): RouteWithStopsWithDirections[] => {
  let nextData = dotProp.set(
    data,
    `${routeIndex}.stops_with_directions.${index}.stop`,
    stop
  );
  nextData = dotProp.set(
    nextData,
    `${routeIndex}.stops_with_directions.${index}.distance`,
    distance
  );
  nextData = dotProp.set(
    nextData,
    `${routeIndex}.stops_with_directions.${index}.directions`,
    // eslint-disable-next-line camelcase
    [{ headsigns: [], direction_id: 0 }, { headsigns: [], direction_id: 1 }]
  );

  return nextData;
};

const setHeadsigns = (
  data: RouteWithStopsWithDirections[],
  routeIndex: number,
  stopIndex: number,
  predictedScheduleByHeadsign: HeadsignDataByHeadsign
): RouteWithStopsWithDirections[] =>
  Object.keys(predictedScheduleByHeadsign).reduce(
    (accumulator: RouteWithStopsWithDirections[], headsign: string) => {
      const {
        direction_id: directionId,
        predicted_schedules: headsignsList
      } = predictedScheduleByHeadsign[headsign];
      const nextData = accumulator;

      return dotProp.set(
        nextData,
        `${routeIndex}.stops_with_directions.${stopIndex}.directions.${directionId}.headsigns`,
        headsignsList
      );
    },
    data
  );

export const transformRoutes = (
  distances: DistanceByStopId,
  data: RouteWithStopsWithDirections[],
  rtData: RealtimeScheduleData[]
): RouteWithStopsWithDirections[] =>
  rtData.reduce(
    (accumulator: RouteWithStopsWithDirections[], rt: RealtimeScheduleData) => {
      const { route, stop, headsigns_by_route_pattern } = rt;
      let nextData = accumulator;
      const [routeState, routeIndex] = findRoute(accumulator, route.id);
      if (routeState === "add") {
        nextData = setRoute(nextData, routeIndex, route);
      }
      const [stopState, stopIndex] = findStop(nextData, routeIndex, stop.id);
      if (stopState === "add") {
        nextData = setStop(
          nextData,
          routeIndex,
          stopIndex,
          stop,
          distances[stop.id]
        );
      }

      nextData = setHeadsigns(
        nextData,
        routeIndex,
        stopIndex,
        headsigns_by_route_pattern
      );

      return nextData;
    },
    data
  );

const findStopInStops = (
  data: StopWithRoutes[],
  stopId: string
): [string, number] => {
  const index = data.findIndex(({ stop }) => stop.id === stopId);
  return index === -1 ? ["add", data.length] : ["update", index];
};

const makeGroupName = (route: EnhancedRoute): string => {
  switch (route.type) {
    case 2:
      return "commuter_rail";

    case 3:
      return "bus";

    case 4:
      return "ferry";

    default:
      return route.name.toLowerCase().replace(" ", "_");
  }
};

const findRouteInStops = (
  data: StopWithRoutes[],
  stopIndex: number,
  route: EnhancedRoute
): [string, number, number] => {
  const groupName = makeGroupName(route);
  const routeGroupIndex = data[stopIndex].routes.findIndex(
    routeGroup => routeGroup.group_name === groupName
  );
  if (routeGroupIndex === -1) {
    return ["add-group", data[stopIndex].routes.length, 0];
  }
  const index = data[stopIndex].routes[routeGroupIndex].routes.findIndex(
    existingRoute => existingRoute.id === route.id
  );
  return index === -1
    ? [
        "add-route",
        routeGroupIndex,
        data[stopIndex].routes[routeGroupIndex].routes.length
      ]
    : ["update-route", routeGroupIndex, index];
};

const setStopInStops = (
  data: StopWithRoutes[],
  index: number,
  stop: Stop,
  distance: string
): StopWithRoutes[] => dotProp.set(data, index, { stop, routes: [], distance });

const setRouteGroupInStops = (
  data: StopWithRoutes[],
  stopIndex: number,
  index: number,
  route: EnhancedRoute
): StopWithRoutes[] =>
  dotProp.set(data, `${stopIndex}.routes.${index}`, {
    // eslint-disable-next-line camelcase
    group_name: makeGroupName(route),
    routes: []
  });

const setRouteInStops = (
  data: StopWithRoutes[],
  stopIndex: number,
  routeGroupIndex: number,
  index: number,
  route: EnhancedRoute
): StopWithRoutes[] =>
  dotProp.set(
    data,
    `${stopIndex}.routes.${routeGroupIndex}.routes.${index}`,
    route
  );

export const transformStops = (
  distances: DistanceByStopId,
  data: StopWithRoutes[],
  realtimeScheduleData: RealtimeScheduleData[]
): StopWithRoutes[] =>
  realtimeScheduleData.reduce(
    (accumulator: StopWithRoutes[], { route, stop }: RealtimeScheduleData) => {
      let nextData = accumulator;

      // get stop index
      const [stopState, stopIndex] = findStopInStops(nextData, stop.id);

      // add stop
      if (stopState === "add") {
        nextData = setStopInStops(
          nextData,
          stopIndex,
          stop,
          distances[stop.id]
        );
      }

      // get route index
      const [routeState, routeGroupIndex, routeIndex] = findRouteInStops(
        nextData,
        stopIndex,
        route
      );

      // add route group
      if (routeState === "add-group") {
        nextData = setRouteGroupInStops(
          nextData,
          stopIndex,
          routeGroupIndex,
          route
        );
      }
      if (routeState === "add-group" || routeState === "add-route") {
        nextData = setRouteInStops(
          nextData,
          stopIndex,
          routeGroupIndex,
          routeIndex,
          route
        );
      }

      return nextData;
    },
    data
  );
