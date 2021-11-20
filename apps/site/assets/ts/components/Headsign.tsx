import React, { ReactElement } from "react";
import { RouteType, HeadsignWithCrowding } from "../__v3api";
import { PredictionForCommuterRail, statusForCommuterRail } from "../helpers/prediction-helpers";

type Props = {
  routeType: RouteType;
  condensed: boolean;
  headsigns: HeadsignWithCrowding[]
}

const headsignClass = (condensed: boolean): string => {
  if (condensed === true) {
    return "m-tnm-sidebar__headsign-schedule m-tnm-sidebar__headsign-schedule--condensed";
  }
  return "m-tnm-sidebar__headsign-schedule";
};

const renderHeadsignName = (
  headsign_name: string | null,
  routeType: RouteType,
  condensed: boolean
): ReactElement<HTMLElement> => {
  const modifier = !condensed && routeType === 3 ? "small" : "large";

  const headsignNameClass = `m-tnm-sidebar__headsign-name m-tnm-sidebar__headsign-name--${modifier}`;

  if (headsign_name && headsign_name.includes(" via ")) {
    const split = headsign_name.split(" via ");
    return (
      <>
        <div className={headsignNameClass}>{split[0]}</div>
        <div className="m-tnm-sidebar__via">{`via ${split[1]}`}</div>
      </>
    );
  }
  return <div className={headsignNameClass}>{headsign_name}</div>;
};

const renderTrainName = (trainName: string): ReactElement<HTMLElement> => (
  <div className="m-tnm-sidebar__headsign-train">{trainName}</div>
);

const renderTimeCommuterRail = (
  headsign: HeadsignWithCrowding,
  modifier: string
): ReactElement<HTMLElement> => {
  const {status, track} = headsign;
  
  const className = `${
    headsign.status === "Canceled" ? "strikethrough" : ""
  } m-tnm-sidebar__time-number`;

  return (
    <div
      className={`m-tnm-sidebar__time m-tnm-sidebar__time--commuter-rail ${modifier} ${
        status === "Scheduled" ? "text-muted" : ""
      }`}
    >
      <PredictionForCommuterRail data={headsign} modifier={className} />
      {status || track ? <div className="m-tnm-sidebar__status">
        {`${statusForCommuterRail(headsign)}${track ? ` track ${track}` : ""}`}
      </div> : null}
    </div>
  );
};

const renderTimeDefault = (
  headsign: HeadsignWithCrowding,
  modifier: string
): ReactElement<HTMLElement> | null => {
  if (!headsign.displayed_time) return null;
  const [t1, t2] = headsign.displayed_time.split(" "); // splits "2 min" or "10:10 AM"
  return (
    <div className={`m-tnm-sidebar__time ${modifier}`}>
      <div className="m-tnm-sidebar__time-number">{t1}</div>
      <div className="m-tnm-sidebar__time-mins">{t2}</div>
    </div>
  );
};

const renderTime = (
  headsign: HeadsignWithCrowding,
  routeType: RouteType,
  idx: number
): ReactElement<HTMLElement> => {
  const classModifier =
    !headsign.predicted_time && [0, 1, 3].includes(routeType)
      ? "m-tnm-sidebar__time--schedule"
      : "";

  return (
    <div
      // eslint-disable-next-line camelcase
      key={`${headsign.headsign_name}-${idx}`}
      className="m-tnm-sidebar__schedule"
    >
      {routeType === 2
        ? renderTimeCommuterRail(headsign, classModifier)
        : renderTimeDefault(headsign, classModifier)}
    </div>
  );
};

// iterate through a list of predicted schedules? idk?
const HeadsignComponent = (props: Props): ReactElement<HTMLElement> => {
  const { headsigns, routeType, condensed } = props;
  const trainNumber = headsigns[0].trip_name;
  const headsign_name = headsigns[0].headsign_name;
  return (
    <div className={headsignClass(condensed)}>
      <div className="m-tnm-sidebar__headsign">
        {renderHeadsignName(headsign_name, routeType, condensed)}

        {routeType === 2 && trainNumber
          ? renderTrainName(`Train ${trainNumber}`)
          : null}
      </div>
      <div className="m-tnm-sidebar__schedules">
        {headsigns
          // .filter(time => predictedOrScheduledTime(time)) // non-null time
          .map((headsign, idx: number) => {
            if (routeType === 2 && idx > 0) return null; // limit to 1 headsign
            return renderTime(headsign, routeType, idx);
          })}
      </div>
    </div>
  );
};

export default HeadsignComponent;
