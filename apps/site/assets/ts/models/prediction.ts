import { TripPrediction } from "../schedule/components/__trips";
import { HeadsignWithCrowding } from "../__v3api";

// eslint-disable-next-line import/prefer-default-export
export const isSkippedOrCancelled = (
  prediction: TripPrediction | null
): boolean =>
  prediction
    ? prediction.schedule_relationship === "skipped" ||
      prediction.schedule_relationship === "cancelled"
    : false;

export const hasPredictionTime = ({
  predicted_time
}: HeadsignWithCrowding): boolean => !!predicted_time;
