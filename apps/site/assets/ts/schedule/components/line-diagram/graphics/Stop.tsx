import React, { ReactElement, useContext } from "react";
import { LineDiagramStop } from "../../__schedule";
import { StopRefContext } from "./useStopPositions";
import { CIRC_RADIUS } from "./graphic-helpers";

const Stop = ({
  stop,
  shuttle
}: {
  stop: LineDiagramStop;
  shuttle?: boolean;
}): ReactElement<SVGCircleElement> | null => {
  const getCoord = useContext(StopRefContext)[2];
  const coords = getCoord(stop.route_stop.id);
  if (!coords) return null;
  const [x, y] = coords;
  return (
    <circle
      className="line-diagram-svg__stop"
      r={`${CIRC_RADIUS}px`}
      cx={`${x}px`}
      cy={`${y}px`}
      data-shuttle={!!shuttle}
    />
  );
};

export default Stop;
