import React, { ReactElement } from "react";
import Diagram from "./graphics/Diagram";
import useStopPositions, { RefList } from "./graphics/useStopPositions";
import LiveVehicles from "./LiveVehicleIcons";
import { LineDiagramStop, RouteStop } from "../__schedule";
import StopCardList from "./StopCardList";

export const StopRefContext = React.createContext<[RefList, () => void]>([
  {},
  () => {}
]);

const LineDiagramWithStops = (props: {
  stops: LineDiagramStop[];
  predictionUrl: string;
  handleStopClick: (stop: RouteStop) => void;
  channel: string;
}): ReactElement<HTMLElement> => {
  const { stops, handleStopClick, predictionUrl, channel } = props;
  // create a ref for each stop - we will use this to track the location of the stop so we can place the line diagram bubbles
  const [stopRefsMap, updateAllStopCoords] = useStopPositions(stops);

  return (
    <StopRefContext.Provider value={[stopRefsMap, updateAllStopCoords]}>
      <div className="m-schedule-diagram">
        <LiveVehicles channel={channel} />
        <Diagram lineDiagram={stops} />
        <StopCardList
          stops={stops}
          predictionUrl={predictionUrl}
          handleStopClick={handleStopClick}
        />
      </div>
    </StopRefContext.Provider>
  );
};

export default LineDiagramWithStops;
