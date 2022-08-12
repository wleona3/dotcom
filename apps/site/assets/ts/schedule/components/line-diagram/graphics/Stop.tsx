import React, { ReactElement } from "react";
import { useSelector } from "react-redux";
import { LineDiagramStop } from "../../__schedule";
import { StopCoord, CoordState, CIRC_RADIUS, BRANCH_SPACING } from "./graphic-helpers";

const CRStops = ["place-ogmnl", "place-mlmnl", "place-north", "place-bbsta", "place-rugg", "place-forhl"]
const Stop = ({
  stop
}: {
  stop: LineDiagramStop;
}): ReactElement<SVGCircleElement> | null => {
  const coords: StopCoord | null = useSelector(
    (state: CoordState) => state[stop.route_stop.id]
  );
  if (!coords) return null;
  const [x, y] = coords;
  return (
    <>
      <circle
        key={stop.route_stop.id}
        className="line-diagram-svg__stop"
        r={`${CIRC_RADIUS}px`}
        cx={`${x}px`}
        cy={`${y}px`}
      />
      {CRStops.includes(stop.route_stop.id) ? (
        <circle
        key={`${stop.route_stop.id}-cr`}
        className="line-diagram-svg__stop"
        r={`${CIRC_RADIUS}px`}
        cx={`${x + BRANCH_SPACING}px`}
        cy={`${y}px`}
      />
      ) : null}
    </>
    
  );
};

export default Stop;
