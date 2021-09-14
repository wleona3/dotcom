import React, { ReactElement } from "react";
import useSWR from "swr";
import { hasPredictionTime } from "../../../models/prediction";
import { LineDiagramStop, RouteStop } from "../__schedule";
import StopCard from "./StopCard";
import StopListWithBranches from "./StopListWithBranches";
import { LiveDataByStop } from "./__line-diagram";
import { hasBranchLines } from "./line-diagram-helpers";

const StopCardList = (props: {
  stops: LineDiagramStop[];
  predictionUrl: string;
  handleStopClick: (stop: RouteStop) => void;
}): ReactElement<HTMLElement> => {
  const { stops, predictionUrl, handleStopClick } = props;

  /**
   * Realtime predictions for all stops
   */
  const { data: maybeLiveData } = useSWR(
    predictionUrl,
    url => fetch(url).then(response => response.json()),
    { refreshInterval: 15000 }
  );
  const liveData = (maybeLiveData || {}) as LiveDataByStop;

  const anyCrowding = Object.values(liveData).some(
    (headsigns): boolean =>
      headsigns.length > 0
        ? headsigns
            .filter(hasPredictionTime)
            .some(
              ({ time_data_with_crowding_list: timeData }): boolean =>
                !!timeData[0].crowding
            )
        : false
  );

  if (hasBranchLines(stops)) {
    return (
      <ol className={`${!anyCrowding ? "u-no-crowding-data" : ""}`}>
        <StopListWithBranches
          stops={stops}
          handleStopClick={handleStopClick}
          liveData={liveData}
        />
      </ol>
    );
  }

  return (
    <ol className={`${!anyCrowding ? "u-no-crowding-data" : ""}`}>
      {stops.map(stop => (
        <StopCard
          key={stop.route_stop.id}
          stop={stop}
          onClick={handleStopClick}
          liveHeadsigns={liveData[stop.route_stop.id]}
        />
      ))}
    </ol>
  );
};

export default StopCardList;
