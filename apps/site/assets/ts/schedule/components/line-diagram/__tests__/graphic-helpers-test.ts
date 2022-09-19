import { render } from "@testing-library/react";
import { DiagonalHatchPattern } from "../graphics/graphic-helpers";

test("DiagonalHatchPattern renders", () => {
  const { asFragment } = render(DiagonalHatchPattern());
  expect(asFragment()).toMatchSnapshot();
});

test("DiagonalHatchPattern renders with custom id", () => {
  const { asFragment } = render(DiagonalHatchPattern("barberpole"));
  expect(asFragment()).toMatchSnapshot();
});
