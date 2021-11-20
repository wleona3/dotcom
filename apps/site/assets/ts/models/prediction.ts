import { HeadsignWithTimeData } from "../__v3api";

export const hasPredictionTime = ({
  predicted_time
}: HeadsignWithTimeData): boolean => !!predicted_time;
