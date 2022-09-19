import { fireEvent, screen } from "@testing-library/react";
import React from "react";
import { renderWithScheduleStoreProvider } from "../../../../__tests__/test-helpers";
import OriginModalContent from "../OriginModalContent";

const stops = [
  {
    name: "Def",
    id: "456",
    is_closed: true,
    zone: null
  },
  {
    name: "SL",
    id: "741",
    is_closed: false,
    zone: "1"
  },
  {
    name: "Wellington",
    id: "place-welln",
    is_closed: false,
    zone: null
  }
];

describe("<OriginModalContent />", () => {
  beforeEach(() => {
    renderWithScheduleStoreProvider(<OriginModalContent stops={stops} />);
  });
  test("shows <OriginListItem /> each stop", () => {
    for (const stop of stops) {
      expect(screen.getByText(stop.name)).toBeTruthy();
    }
  });

  test("shows input to filter", () => {
    expect(screen.getByRole("heading").textContent).toContain(
      "Choose an origin stop"
    );
    expect(
      screen.getByPlaceholderText("Filter stops and stations")
    ).toBeTruthy();
  });
});

test("<OriginModalContent /> allows list filtering", () => {
  const { container } = renderWithScheduleStoreProvider(
    <OriginModalContent stops={stops} />
  );
  const numStopsListed = () =>
    container.querySelectorAll(".schedule-finder__origin-list-item").length;

  expect(numStopsListed()).toEqual(3);
  fireEvent.change(screen.getByPlaceholderText("Filter stops and stations"), {
    target: { value: "Wel" }
  });
  expect(numStopsListed()).toEqual(1);
});
