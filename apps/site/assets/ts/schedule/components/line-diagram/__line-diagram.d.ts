import { HeadsignWithCrowding } from "../../../__v3api";

export interface LiveDataByStop {
  [stopId: string]: HeadsignWithCrowding[];
}

export type BranchDirection = "inward" | "outward";
