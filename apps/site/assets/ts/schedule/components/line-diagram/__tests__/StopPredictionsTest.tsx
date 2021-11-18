import React from "react";
import renderer from "react-test-renderer";
import { mount } from "enzyme";
import { HeadsignWithCrowding } from "../../../../__v3api";
import StopPredictions from "../StopPredictions";

describe("StopPredictions", () => {
  it("renders bus predictions", () => {
    const headsigns: HeadsignWithCrowding[] = [
      {
        headsign_name: "Harvard",
        trip_name: null,
        status: null,
        track: null,
        vehicle_crowding: null,
        predicted_time: new Date(), // 6min
        scheduled_time: new Date(), // 315pm
        delay: 0,
        skipped_or_cancelled: false
      }
    ];

    const tree = renderer
      .create(<StopPredictions headsigns={headsigns} isCommuterRail={false} />)
      .toJSON();

    expect(tree).toMatchSnapshot();
  });

  it("renders commuter rail predictions", () => {
    const headsigns: HeadsignWithCrowding[] = [
      {
        headsign_name: "Worcester",
        trip_name: "7519",
        status: null,
        track: null,
        vehicle_crowding: null,
        predicted_time: new Date(), // 6min
        scheduled_time: new Date(), // 415pm
        delay: 0,
        skipped_or_cancelled: false
      }
    ];

    const tree = renderer
      .create(<StopPredictions headsigns={headsigns} isCommuterRail={true} />)
      .toJSON();

    expect(tree).toMatchSnapshot();
  });

  it("renders commuter rail predictions with a skipped stop", () => {
    const headsigns: HeadsignWithCrowding[] = [
      {
        headsign_name: "Worcester",
        trip_name: "7519",
        status: null,
        track: null,
        vehicle_crowding: null,
        predicted_time: new Date(), // 6min
        scheduled_time: new Date(), // 415pm
        delay: 0,
        skipped_or_cancelled: true
      }
    ];

    const wrapper = mount(
      <StopPredictions headsigns={headsigns} isCommuterRail={true} />
    );

    expect(
      wrapper
        .find(".m-schedule-diagram__cr-prediction-time.strikethrough")
        .exists()
    ).toBeTruthy();
  });
});
