import { CrowdingType } from "../schedule/components/__schedule";
import { RouteType } from "../__v3api";

// See also Routes.Route.vehicle_name/1
export const vehicleName = (routeType: RouteType): string =>
  ({
    0: "Train",
    1: "Train",
    2: "Train",
    3: "Bus",
    4: "Boat"
  }[routeType]);

export const crowdingDescriptions = (crowding: CrowdingType): string =>
  crowding
    ? {
        // eslint-disable-next-line camelcase
        not_crowded: "Not crowded",
        // eslint-disable-next-line camelcase
        some_crowding: "Some crowding",
        crowded: "Crowded"
      }[crowding]
    : "";
