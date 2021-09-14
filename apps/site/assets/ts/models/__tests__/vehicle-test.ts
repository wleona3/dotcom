import { vehicleName, crowdingDescriptions } from "../vehicle";
import { LineDiagramVehicle } from "../../schedule/components/__schedule";

it.each`
  routeType | expectedName
  ${0}      | ${"Train"}
  ${1}      | ${"Train"}
  ${2}      | ${"Train"}
  ${3}      | ${"Bus"}
  ${4}      | ${"Boat"}
`(
  "vehicleName returns appropriate text for a route type $routeType",
  ({ routeType, expectedName }) => {
    expect(vehicleName(routeType)).toBe(expectedName);
  }
);

it.each`
  crowding           | description
  ${"not_crowded"}   | ${"Not crowded"}
  ${"some_crowding"} | ${"Some crowding"}
  ${"crowded"}       | ${"Crowded"}
`("crowdingDescriptions for $crowding", ({ crowding, description }) => {
  expect(crowdingDescriptions(crowding)).toBe(description);
});
