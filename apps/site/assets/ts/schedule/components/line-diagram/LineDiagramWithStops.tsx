import React, { ReactElement } from "react";
import { hasBranchLines } from "./line-diagram-helpers";
import Diagram from "./graphics/Diagram";
import StopListWithBranches from "./StopListWithBranches";
import { CommonLineDiagramProps } from "./__line-diagram";
import useStopPositions, { RefMap } from "./graphics/useStopPositions";
import StopCard from "./StopCard";
import { hasPredictionTime } from "../../../models/prediction";
import currentLineSuspensions from "../../../helpers/line-suspensions";
import { BASE_LINE_WIDTH, BRANCH_SPACING } from "./graphics/graphic-helpers";

export const StopRefContext = React.createContext<[RefMap, () => void]>([
  new Map(),
  () => {}
]);

const LineDiagramWithStops = (
  props: CommonLineDiagramProps
): ReactElement<HTMLElement> => {
  const { stops, handleStopClick, liveData } = props;

  // create a ref for each stop - we will use this to track the location of the stop so we can place the line diagram bubbles
  const [stopRefsMap, updateAllStopCoords] = useStopPositions(stops);

  const anyCrowding = Object.values(
    liveData || {}
  ).some(({ headsigns }): boolean =>
    headsigns
      ? headsigns
          .filter(hasPredictionTime)
          .some(
            ({ time_data_with_crowding_list: timeData }): boolean =>
              !!timeData[0].crowding
          )
      : false
  );

  const { shuttledStopsLists, crStopsLists } =
    currentLineSuspensions(stops[0].route_stop.route?.id ?? "") || {};

  /* istanbul ignore next */

  const crDiagrams =
    crStopsLists && Object.entries(crStopsLists["0"]).length > 0
      ? Object.values(crStopsLists["0"]).map(stopsList => {
          const coveredStops = stops.filter(s =>
            stopsList.includes(s.route_stop.id)
          );
          return (
            <Diagram
              lineDiagram={coveredStops}
              liveData={{}}
              overrideStyle="commuter-rail"
            />
          );
        })
      : null;

  /* istanbul ignore next */

  const shuttleDiagrams =
    shuttledStopsLists && Object.entries(shuttledStopsLists["0"]).length > 0
      ? Object.values(shuttledStopsLists["0"]).map(stopsList => {
          const coveredStops = stops.filter(s =>
            stopsList.includes(s.route_stop.id)
          );
          return (
            <Diagram
              lineDiagram={coveredStops}
              liveData={{}}
              overrideStyle="shuttle"
              overridePlacement={BRANCH_SPACING / 2 + BASE_LINE_WIDTH + 1}
            />
          );
        })
      : null;

  return (
    <StopRefContext.Provider value={[stopRefsMap, updateAllStopCoords]}>
      <div
        className={`m-schedule-diagram ${
          !anyCrowding ? "u-no-crowding-data" : ""
        }`}
      >
        {!(shuttledStopsLists || crStopsLists) ? (
          <Diagram lineDiagram={stops} liveData={liveData} />
        ) : (
          /* istanbul ignore next */ <>
            {crDiagrams}
            {shuttleDiagrams}
          </>
        )}
        {hasBranchLines(stops) ? (
          <StopListWithBranches {...props} />
        ) : (
          <ol>
            {stops.map(stop => (
              <StopCard
                key={stop.route_stop.id}
                stop={stop}
                onClick={handleStopClick}
                liveData={liveData?.[stop.route_stop.id]}
              />
            ))}
          </ol>
        )}
      </div>
    </StopRefContext.Provider>
  );
};

export default LineDiagramWithStops;
