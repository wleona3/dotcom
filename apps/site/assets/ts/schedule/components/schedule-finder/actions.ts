/**
 * Various functions affecting the redux store than manages some of the <ScheduleFinderModal> state
 */

import { updateParams } from "../../../helpers/use-params";
import { DirectionId } from "../../../__v3api";
import { storeHandler } from "../../store/ScheduleStore";
import { SelectedOrigin } from "../__schedule";

export const handleOriginSelectClick = (): void => {
  storeHandler({
    type: "OPEN_MODAL",
    newStoreValues: {
      modalMode: "origin"
    }
  });
};

export const closeModal = (): void => {
  storeHandler({
    type: "CLOSE_MODAL",
    newStoreValues: {}
  });
  // clear parameters from URL when closing the modal:
  updateParams({
    // eslint-disable-next-line camelcase
    "schedule_finder[direction_id]": null,
    "schedule_finder[origin]": null
  });
};

export const changeDirection = (direction: DirectionId): void => {
  storeHandler({
    type: "CHANGE_DIRECTION",
    newStoreValues: {
      selectedDirection: direction,
      selectedOrigin: null
    }
  });
};

export const changeOrigin = (origin: SelectedOrigin): void => {
  storeHandler({
    type: "CHANGE_ORIGIN",
    newStoreValues: {
      selectedOrigin: origin
    }
  });
  // reopen modal depending on choice:
  storeHandler({
    type: "OPEN_MODAL",
    newStoreValues: {
      modalMode: origin ? "schedule" : "origin"
    }
  });
};
