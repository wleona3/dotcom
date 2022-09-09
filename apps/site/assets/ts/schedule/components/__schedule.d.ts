import { TypedRoutes } from "../../stop/components/__stop";
import {
  Alert,
  Route,
  PredictedOrScheduledTime,
  EnhancedRoute,
  DirectionId,
  Service,
  Schedule,
  RoutePattern,
  Shape,
  Stop,
  ClosedStopInfo
} from "../../__v3api";

export interface EnhancedRoutePattern extends RoutePattern {
  shape_id: string;
  shape_priority: number;
  headsign: string;
}

export interface ShapesById {
  [key: string]: Shape;
}

export interface RoutePatternsByDirection {
  [key: string]: EnhancedRoutePattern[];
}

export interface ServiceInSelector extends Service {
  "default_service?": boolean;
}

export interface SchedulePageData {
  connections: TypedRoutes[];
  pdfs: SchedulePDF[];
  teasers: string | null;
  hours: string;
  fares: Fare[];
  fare_link: string;
  holidays: Holiday[];
  route: EnhancedRoute;
  schedule_note: ScheduleNote | null;
  services: ServiceInSelector[];
  stops: SimpleStopMap;
  direction_id: DirectionId;
  route_patterns: RoutePatternsByDirection;
  line_diagram: LineDiagramStop[];
  today: string;
  variant: string | null;
}

interface StopData {
  branch: string | null;
  type: "line" | "merge" | "stop" | "terminus" | null;
  "has_disruption?": boolean;
}

export interface LineDiagramStop {
  stop_data: StopData[];
  route_stop: RouteStop;
  alerts: Alert[];
}

export type CrowdingType = "not_crowded" | "some_crowding" | "crowded" | null;

export interface LineDiagramVehicle {
  id: string;
  status: "in_transit" | "incoming" | "stopped";
  crowding: CrowdingType;
  tooltip: string;
}

interface RouteStopRoute extends Route {
  "custom_route?": boolean;
}
export interface RouteStop {
  id: string;
  name: string;
  zone: string | null;
  branch: string | null;
  station_info: Stop & { parent_id: string | null; child_ids: string[] };
  route: RouteStopRoute | null;
  connections: RouteStopRoute[];
  stop_features: string[];
  "is_terminus?": boolean;
  "is_beginning?": boolean;
  closed_stop_info: ClosedStopInfo | null;
}

export interface SimpleStopMap {
  [key: string]: SimpleStop[];
}

export interface ServiceSchedule {
  [key: string]: ServiceScheduleInfo;
}

export interface ScheduleInfo {
  schedules: ScheduleWithFare[];
  duration: string;
  route_pattern_id: string;
}

export interface ScheduleWithFare extends Schedule {
  price: string;
  fare_link: string;
}

export interface ServiceScheduleByTrip {
  [key: string]: ScheduleInfo;
}

export interface ServiceScheduleInfo {
  by_trip: ServiceScheduleByTrip;
  trip_order: string[];
}

export interface ScheduleNote {
  peak_service: string;
  offpeak_service: string;
  exceptions: ServiceException[];
  alternate_text: string | null;
}

export interface ServiceException {
  type: string;
  service: string;
}

export interface SimpleStop {
  id: string;
  name: string;
  is_closed: boolean;
  zone: string | null;
}

export interface SchedulePDF {
  title: string;
  url: string;
}

export interface Fare {
  title: string;
  price: string;
}

export interface Holiday {
  name: string;
  date: string;
}

export interface StopPrediction {
  headsign: string;
  route: Route;
  prediction: PredictedOrScheduledTime;
  train_number: string;
}

export type SelectedOrigin = string | null;
export interface UserInput {
  route: string;
  origin: string;
  date: string;
  direction: DirectionId;
}
