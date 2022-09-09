import React, { FormEvent, ReactElement, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DirectionId, DirectionInfo, Route } from "../../../__v3api";
import { SimpleStopMap } from "../__schedule";
import icon from "../../../../static/images/icon-schedule-finder.svg";
import renderSvg from "../../../helpers/render-svg";
import SelectContainer from "./SelectContainer";
import { routeToModeName } from "../../../helpers/css";
import {
  changeScheduleFinderDirection,
  changeScheduleFinderOrigin,
  getDirection,
  getOrigin,
  openOriginModal
} from "../../store/schedule-store";

const validDirections = (directionInfo: DirectionInfo): DirectionId[] =>
  ([0, 1] as DirectionId[]).filter(dir => directionInfo[dir] !== null);

interface Props {
  onSubmit?: () => void;
  route: Route;
  stopsByDirection: SimpleStopMap;
}

export default ({
  onSubmit = () => {},
  route,
  stopsByDirection
}: Props): ReactElement => {
  const {
    direction_names: directionNames,
    direction_destinations: directionDestinations
  } = route;

  const [originError, setOriginError] = useState(false);
  const scheduleDispatch = useDispatch();

  const handleOriginClick = (): void => {
    setOriginError(false);
    scheduleDispatch(openOriginModal());
  };

  const selectedDirection = useSelector(getDirection);
  const selectedOrigin = useSelector(getOrigin);
  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (!selectedOrigin) {
      setOriginError(true);
    } else {
      setOriginError(false);
      onSubmit();
    }
  };

  const directionNameForId = (
    direction: DirectionId
  ): string => `${directionNames[direction]!.toUpperCase()} 
  ${directionDestinations[direction]!}`;

  const isFerryRoute = routeToModeName(route) === "ferry";

  return (
    <>
      <form onSubmit={handleSubmit}>
        <h2 className="schedule-finder__heading">
          {renderSvg("c-svg__icon", icon, true)} Schedule Finder
        </h2>
        <div className="schedule-finder__prompt">
          {isFerryRoute
            ? `Get schedule information for your next ${route.name} trip.`
            : "Choose a stop to get schedule information and real-time departure predictions."}
        </div>

        {originError && (
          <div className="error-container">
            <span role="alert">Please provide an origin</span>
          </div>
        )}

        <div className="schedule-finder__inputs">
          <label className="schedule-finder__label">
            Choose a direction
            <SelectContainer>
              <select
                className="c-select-custom notranslate"
                value={selectedDirection}
                onChange={e =>
                  scheduleDispatch(
                    changeScheduleFinderDirection(
                      parseInt(e.target.value, 10) as DirectionId
                    )
                  )
                }
              >
                {validDirections(directionNames).map(direction => (
                  <option
                    key={direction}
                    value={direction}
                    aria-label={directionNameForId(direction)}
                  >
                    {directionNameForId(direction)}
                  </option>
                ))}
              </select>
            </SelectContainer>
          </label>

          <label className="schedule-finder__label">
            Choose an origin stop
            <SelectContainer
              error={originError}
              handleClick={handleOriginClick}
            >
              <select
                className="c-select-custom c-select-custom--noclick notranslate"
                value={selectedOrigin || ""}
                onChange={e =>
                  scheduleDispatch(changeScheduleFinderOrigin(e.target.value))
                }
              >
                <option value="">Select</option>
                {stopsByDirection[selectedDirection].map(({ id, name }) => (
                  <option key={id} value={id} aria-label={name}>
                    {name}
                  </option>
                ))}
              </select>
            </SelectContainer>
          </label>
        </div>

        <div className="schedule-finder__submit text-right">
          <input
            className="btn btn-primary"
            type="submit"
            value="Get schedules"
          />
        </div>
      </form>
    </>
  );
};
