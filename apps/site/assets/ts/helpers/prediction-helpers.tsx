import React, { ReactElement } from "react";
import { HeadsignWithCrowding, PredictedOrScheduledTime } from "../__v3api";
import { isSkippedOrCancelled } from "../models/prediction";
import { TripPrediction } from "../schedule/components/__trips";

export const predictedOrScheduledTime = (
  data: PredictedOrScheduledTime
): string | null => {
  const { prediction, scheduled_time: scheduledTime } = data;
  const time = prediction && prediction.time ? prediction.time : scheduledTime;
  return time;
};

type PredictionForCommuterRailType =
  | Pick<HeadsignWithCrowding, "delay" | "predicted_time" | "scheduled_time">
  | PredictedOrScheduledTime;
export const PredictionForCommuterRail = ({
  data,
  modifier
}: {
  data: PredictionForCommuterRailType;
  modifier?: string;
}): ReactElement<HTMLElement> | null => {
  // TODO: When done refactoring elsewhere, simplify this to only need the dates and delay.
  const isOldVersion = (
    d: PredictionForCommuterRailType
  ): d is PredictedOrScheduledTime =>
    (d as PredictedOrScheduledTime).prediction !== undefined;
  let predicted_time;
  let scheduled_time;
  let delay: number;
  if (isOldVersion(data)) {
    // data came from journey/realtime
    delay = data.delay;
    scheduled_time = data.scheduled_time;
    predicted_time = data.prediction ? data.prediction!.time : null;
  } else {
    // came from HeadsignWithCrowding
    delay = data.delay;
    scheduled_time = data.scheduled_time;
    predicted_time = data.predicted_time;
  }

  // if no time, that means there's neither a scheduled nor predicted time.
  // can't show anything in that case.
  if (!predicted_time && !scheduled_time) return null;

  const hasDelay = delay! && delay >= 5 && predicted_time!;
  return (
    <>
      {hasDelay ? (
        <div className={modifier ? `${modifier}--delayed` : ""}>
          {scheduled_time}
        </div>
      ) : null}
      <div className={modifier}>{predicted_time || scheduled_time}</div>
    </>
  );
};

export const statusForCommuterRail = ({
  delay,
  scheduled_time: scheduledTime,
  prediction
}: PredictedOrScheduledTime): string | null => {
  // If there is a human-entered status string, prioritize that
  if (prediction && prediction.status) return prediction.status;

  if (isSkippedOrCancelled((prediction as unknown) as TripPrediction))
    return "Canceled";

  // Indicate "Delayed" if train is delayed 5+ minutes
  if (delay >= 5) return `Delayed ${delay} min`;

  // Indicate "On time" if train otherwise has a prediction
  // Indicate "Scheduled" if train is not "Delayed" and we have a scheduled time
  // (even if there is no real-time prediction)
  if (scheduledTime && prediction) return "On time";
  if (scheduledTime) return "Scheduled";

  // We have just a prediction with no scheduled time, so we can't say whether
  // the train is on time, delayed, etc.
  return null;
};

export const trackForCommuterRail = ({
  prediction
}: PredictedOrScheduledTime): string =>
  prediction && prediction.track ? ` track ${prediction.track}` : "";
