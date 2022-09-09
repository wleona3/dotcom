import React, { ReactElement, Dispatch } from "react";
import { useDispatch, useSelector } from "react-redux";
import renderSVG from "../../../helpers/render-svg";
import icon from "../../../../static/images/icon-change-direction.svg";
import { MenuAction, toggleDirectionAction } from "./reducer";
import { getPageDirection, resetDirection } from "../../store/schedule-store";

interface Props {
  dispatch: Dispatch<MenuAction>;
}

const ScheduleDirectionButton = ({
  dispatch
}: Props): ReactElement<HTMLElement> => {
  const selectedDirection = useSelector(getPageDirection);
  const scheduleDispatch = useDispatch();

  // Reconcile with Redux store managing direction state elsewhere
  const changeDirection = (): void => {
    const nextDirection = selectedDirection === 1 ? 0 : 1;
    scheduleDispatch(resetDirection(nextDirection));
    dispatch(toggleDirectionAction());
  };

  return (
    <button
      type="button"
      className="m-schedule-direction__button btn btn-primary"
      onClick={changeDirection}
    >
      {renderSVG("m-schedule-direction__icon", icon)}Change Direction
    </button>
  );
};
export default ScheduleDirectionButton;
