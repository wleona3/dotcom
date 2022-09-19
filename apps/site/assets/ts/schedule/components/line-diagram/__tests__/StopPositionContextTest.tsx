import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  useStopPositionCoordinates,
  useStopPositionReset,
  useStopRefs
} from "../contexts/StopPositionContext";
import { LineDiagramStop } from "../../__schedule";
import { mockedRenderWithStopPositionContext } from "../../../../__tests__/test-helpers";
import simpleLineDiagram from "./lineDiagramData/simple.json";

const lineDiagram = (simpleLineDiagram as unknown) as LineDiagramStop[];

const useStopPositionResetSpy = jest.fn();
jest.mock("../contexts/StopPositionContext", () => {
  return {
    ...jest.requireActual("../contexts/StopPositionContext"),
    useStopPositionReset: () => useStopPositionResetSpy
  };
});

function TestConsumerComponent() {
  const allCoordinates = useStopPositionCoordinates();
  const refMap = useStopRefs();
  const resetFn = useStopPositionReset();
  const renderedRefs = (
    <ul data-testid="refs">
      {Array.from(refMap.keys()).map(stopId => (
        <li key={stopId} ref={el => refMap.set(stopId, el)}>
          {stopId} content
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {renderedRefs}
      <button data-testid="reset" onClick={() => resetFn()} />
      <ul data-testid="state">
        {allCoordinates &&
          Object.keys(allCoordinates).map(stopId => (
            <li key={`state-${stopId}`} />
          ))}
      </ul>
    </>
  );
}

describe("<StopPositionProvider>", () => {
  beforeEach(() => {
    mockedRenderWithStopPositionContext(<TestConsumerComponent />, lineDiagram);
  });

  test("provides map of refs for each stop", () => {
    expect(screen.getByTestId("refs").children).toHaveLength(
      lineDiagram.length
    );
  });

  test("provides object tracking coordinates for each ref", () => {
    expect(screen.getByTestId("state").children).toHaveLength(
      lineDiagram.length
    );
  });

  test("provides an update function", async () => {
    expect(useStopPositionResetSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("reset"));

    await waitFor(() => {
      expect(useStopPositionResetSpy).toHaveBeenCalled();
    });
  });
});
