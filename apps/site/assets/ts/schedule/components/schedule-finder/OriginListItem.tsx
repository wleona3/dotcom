import React, { ReactElement } from "react";
import { useDispatch, useSelector } from "react-redux";
import { handleReactEnterKeyPress } from "../../../helpers/keyboard-events-react";
import renderSvg from "../../../helpers/render-svg";
import checkIcon from "../../../../static/images/icon-checkmark.svg";
import { SimpleStop } from "../__schedule";
import {
  changeScheduleFinderOrigin,
  getOrigin
} from "../../store/schedule-store";

interface OriginListItemProps {
  stop: SimpleStop;
  lastStop: SimpleStop;
}

const OriginListItem = ({
  stop,
  lastStop
}: OriginListItemProps): ReactElement<HTMLElement> => {
  const selectedOrigin = useSelector(getOrigin);
  const isDisabled = stop.is_closed || stop.id === lastStop.id;
  const scheduleDispatch = useDispatch();
  const handleClick = (): void => {
    if (isDisabled) return;
    scheduleDispatch(changeScheduleFinderOrigin(stop.id));
  };

  return (
    <div
      tabIndex={0}
      role="button"
      className={`schedule-finder__origin-list-item ${
        stop.id === selectedOrigin ? "active" : ""
      } ${isDisabled ? "disabled" : ""}`}
      onClick={() => {
        handleClick();
      }}
      onKeyUp={e =>
        handleReactEnterKeyPress(e, () => {
          handleClick();
        })
      }
    >
      <div className="schedule-finder__origin-list-leftpad">
        {stop.id === selectedOrigin
          ? renderSvg("schedule-finder__check", checkIcon)
          : ""}{" "}
      </div>
      {stop.name}{" "}
      {stop.zone && (
        <span className="schedule-finder__zone">Zone {stop.zone}</span>
      )}
    </div>
  );
};

export default OriginListItem;
