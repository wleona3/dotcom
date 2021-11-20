import {
  EnhancedRoute,
  Mode,
  Stop,
  DirectionId,
  HeadsignWithTimeData
} from "../../__v3api";

export interface DistanceByStopId {
  [key: string]: string;
}

export interface StopsWithDistances {
  stops: Stop[];
  distances: DistanceByStopId;
}

export interface StopWithRoutes {
  stop: Stop;
  routes: RouteGroup[];
  distance: string;
}

export interface RouteGroup {
  group_name: Mode;
  routes: EnhancedRoute[];
}

export interface HeadsignWithDirection {
  predicted_schedules: HeadsignWithTimeData[];
  direction_id: DirectionId;
}

export interface HeadsignDataByHeadsign {
  [key: string]: HeadsignWithDirection;
}

export interface RealtimeScheduleData {
  stop: Stop;
  route: EnhancedRoute;
  headsigns_by_route_pattern: HeadsignDataByHeadsign;
}
