import React, { ReactElement } from "react";
import { HeadsignWithTimeData } from "../__v3api";

export const PredictionForCommuterRail = ({
  data,
  modifier
}: {
  data: HeadsignWithTimeData;
  modifier?: string;
}): ReactElement<HTMLElement> | null => {
  const { delay, scheduled_time, displayed_time } = data;

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

export const statusForCommuterRail = (
  headsign: HeadsignWithTimeData
): string | null => {
  const {
    status,
    delay,
    skipped_or_cancelled,
    scheduled_time,
    predicted_time
  } = headsign;
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
