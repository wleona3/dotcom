import React, { ReactElement } from "react";
import { handleReactEnterKeyPress } from "../../../helpers/keyboard-events";
import renderSvg from "../../../helpers/render-svg";
import checkIcon from "../../../../static/images/icon-checkmark.svg";
import { SimpleStop, SelectedStop } from "../__schedule";

interface StopListItemProps {
  changeStop: Function;
  stop: SimpleStop;
  selectedStop: SelectedStop;
  lastStop: SimpleStop;
}

const StopListItem = ({
  changeStop,
  stop,
  selectedStop,
  lastStop
}: StopListItemProps): ReactElement<HTMLElement> => {
  const isDisabled = stop.is_closed || stop.id === lastStop.id;
  const handleClick = (): void => {
    if (isDisabled) return;
    changeStop(stop.id);
  };

  return (
    <div
      tabIndex={0}
      role="button"
      className={`schedule-finder__Stop-list-item ${
        stop.id === selectedStop ? "active" : ""
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
      <div className="schedule-finder__Stop-list-leftpad">
        {stop.id === selectedStop
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

export default StopListItem;
