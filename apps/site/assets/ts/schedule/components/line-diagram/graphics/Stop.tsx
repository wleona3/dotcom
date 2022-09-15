import React, { ReactElement } from "react";
import { LineDiagramStop } from "../../__schedule";
import { useStopPositionCoordinates } from "../contexts/StopPositionContext";
import { CIRC_RADIUS } from "./graphic-helpers";

const Stop = ({
  stop,
  shuttle
}: {
  stop: LineDiagramStop;
  shuttle?: boolean;
}): ReactElement<SVGCircleElement> | null => {
  const coords = useStopPositionCoordinates(stop.route_stop.id);
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
