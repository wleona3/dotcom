import React from "react";
import { render } from "@testing-library/react";
import { GreenLineItem } from "../GreenLineMenu";
const greenRoute = {
  name: "Green Line",
  id: "Green",
  direction_destinations: [
    "Boston College / Cleveland Circle / Riverside / Heath Street",
    "Park Street / Government Center / North Station / Lechmere"
  ],
  icon: ""
};

describe("GreenLineItem", () => {
  it("renders a menu item", () => {
    const { asFragment } = render(
      <GreenLineItem
        route={greenRoute}
        routeIds={["Green", "Green-B", "Green-C", "Green-D", "Green-E"]}
        selected={true}
        focused={true}
        directionId={1}
      />
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
