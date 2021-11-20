import React, { ReactElement } from "react";
import { HeadsignWithCrowding } from "../__v3api";

// export const predictedOrScheduledTime = (
//   data: PredictedOrScheduledTime
// ): string | null => {
//   const { prediction, scheduled_time: scheduledTime } = data;
//   const time = prediction && prediction.time ? prediction.time : scheduledTime;
//   return time;
// };
// type PredictionForCommuterRailType =
//   | Pick<HeadsignWithCrowding, "delay" | "predicted_time" | "scheduled_time" | "displayed_time">
//   | PredictedOrScheduledTime;
// TODO: When done refactoring elsewhere, simplify this to only need the dates and delay.
// const isOldVersion = (
//   d: PredictionForCommuterRailType
// ): d is PredictedOrScheduledTime =>
//   (d as PredictedOrScheduledTime).prediction !== undefined;

// export const predictedOrScheduledTime = (
//   data: PredictionForCommuterRailType
// ): Date | string | null => {
//   if (isOldVersion(data)) {
//     const { prediction, scheduled_time: scheduledTime } = data;
//     const time = prediction && prediction.time ? prediction.time : scheduledTime;
//     return time;
//   } else {
//     const { predicted_time, scheduled_time } = data;
//     const time = predicted_time ? predicted_time : scheduled_time;
//     return time;
//   }
// };

export const PredictionForCommuterRail = ({
  data,
  modifier
}: {
  data: HeadsignWithCrowding;
  modifier?: string;
}): ReactElement<HTMLElement> | null => {

  // let predicted_time;
  // let scheduled_time;
  // let delay: number;
  // if (isOldVersion(data)) {
  //   // data came from journey/realtime
  //   delay = data.delay;
  //   scheduled_time = data.scheduled_time;
  //   predicted_time = data.prediction ? data.prediction!.time : null;
  // } else {
    // came from HeadsignWithCrowding
  const { delay, scheduled_time, displayed_time } = data;
  // }

  // if no time, that means there's neither a scheduled nor predicted time.
  // can't show anything in that case.
  if (!displayed_time) return null;

  return (
    <>
      {delay! && delay >= 5 ? (
        <div className={modifier ? `${modifier}--delayed` : ""}>
          {scheduled_time}
        </div>
      ) : null}
      <div className={modifier}>{displayed_time}</div>
    </>
  );
};

export const statusForCommuterRail = (headsign: HeadsignWithCrowding): string | null => {
  const {status, delay, skipped_or_cancelled, scheduled_time, predicted_time} = headsign;
  // If there is a human-entered status string, prioritize that
  if (status) return status;
  
  if (skipped_or_cancelled) return "Canceled";

  // Indicate "Delayed" if train is delayed 5+ minutes
  if (delay >= 5) return `Delayed ${delay} min`;

  // Indicate "On time" if train otherwise has a prediction
  // Indicate "Scheduled" if train is not "Delayed" and we have a scheduled time
  // (even if there is no real-time prediction)
  if (scheduled_time && predicted_time) return "On time";
  if (scheduled_time) return "Scheduled";

  // We have just a prediction with no scheduled time, so we can't say whether
  // the train is on time, delayed, etc.
  return null;
};

// export const trackForCommuterRail = ({
//   prediction
// }: PredictedOrScheduledTime): string =>
//   prediction && prediction.track ? ` track ${prediction.track}` : "";
