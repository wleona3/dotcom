import { TimePeriodPairs } from "../__v3api";

interface LineSuspensions {
  [routeId: string]: TimePeriodPairs;
}

interface LineSuspensionInfo {
  shuttledStopsLists: SuspendedStopsInfo;
  crStopsLists: SuspendedStopsInfo;
}

interface SuspendedStopsInfo {
  [routePatternId: string]: SuspendedStopsList;
}

interface SuspendedStopsList {
  [directionId: string]: string[];
}

/* istanbul ignore next */
export const shuttleForStop = (
  stopId: string,
  shuttleStopsList: SuspendedStopsInfo
): string | undefined =>
  shuttleStopsList["0"]
    ? Object.entries(shuttleStopsList["0"]).find(([, stops]) =>
        stops.includes(stopId)
      )?.[0]
    : undefined;

const makePill = (extra: string = "") => (
  routeId: string,
  routeName: string,
  bgClassName: string
) => `
<a href="/schedules/${routeId}" class="mr-025" data-toggle="tooltip" data-trigger="hover focus" data-placement="bottom" data-animation="false" data-html="false" data-selector="true" data-original-title="${routeName} ${extra}"><span class="c-icon__bus-pill--small m-schedule-diagram__connection u-bg--${bgClassName}">${routeName}</span></a>
`;
const BUS_39 = makePill()("39", "39", "bus");
const BUS_92 = makePill()("92", "92", "bus");
const BUS_93 = makePill()("93", "93", "bus");
const BUS_CT2 = makePill()("747", "CT2", "bus");
const GL_E = (extra?: string): string =>
  makePill(extra)("Green-E", "Green Line E", "green-line");
const GL = (extra?: string): string =>
  makePill(extra)("Green", "Green Line", "green-line");
const BLUE = makePill()("Blue", "Blue Line", "blue-line");
const SL4 = makePill("with added buses")("751", "SL4", "silver-line");
const SL5 = makePill("with added buses")("749", "SL5", "silver-line");

const recommendedConnections: { [stopId: string]: string[] } = {
  "place-forhl": [BUS_39],
  "place-grnst": [BUS_39],
  "place-sbmnl": [BUS_39],
  "place-rugg": [GL_E(), BUS_39, BUS_CT2],
  "place-masta": [GL_E("(@ Symphony)")],
  "place-bbsta": [GL("(@ Copley)"), BUS_39],
  "place-tumnl": [SL4, SL5],
  "place-chncl": [GL("(@ Boylston)"), SL4, SL5],
  "place-dwnxg": [GL("(@ Park)"), SL4, SL5],
  "place-state": [BLUE],
  "place-sull": [BUS_92, BUS_93, BUS_CT2]
};

export const suspensionStopConnections = (
  stopId: string
): string[] | undefined => recommendedConnections[stopId];

/* eslint-disable consistent-return */
const currentLineSuspensions = (
  routeId: string
): LineSuspensionInfo | undefined => {
  if (!document) return;

  const lineSuspensionsEl: Element | undefined = document.querySelector(
    "[data-line-suspensions]"
  )!;
  if (!lineSuspensionsEl) return;

  // get list of line suspensions encoded in the
  // <div [data-line-suspensions]></div> element
  const suspensions: LineSuspensions = Object.fromEntries(
    JSON.parse(lineSuspensionsEl.innerHTML)
  );

  if (!Object.keys(suspensions).includes(routeId)) return;
  return {
    shuttledStopsLists: {
      /**
       * TODO: Stop hardcoding these
       * These are the stop IDs that come from the official route patterns.
       * They are shuttle stops, and right now we can't programmatically
       * associate them with rail stops.
       */
      // "Shuttle-GovernmentCenterOakGrove": {
      //   "0": ["place-ogmnl", "place-mlmnl", "place-welln", "28743", "place-sull", "9070028",
      //   "9170206", "9070024", "65", "4510"],
      //   "1": ["4510", "9070090", "9070029", "place-sull", "28742", "place-welln",
      //   "place-mlmnl", "place-ogmnl"]
      // },
      // "Shuttle-CopleyForestHills": {
      //   "0": ["9070154", "9170014", "9070012", "9070010", "1258", "9070006", "9070004",
      //   "9070002", "place-forhl"],
      //   "1": ["place-forhl", "9070003", "9070005", "9070007", "1222", "place-rugg",
      //   "9070013", "11384", "9070154"],
      // }

      "0": {
        // south-bound
        "Shuttle-CopleyForestHills": [
          "place-coecl",
          "place-bbsta",
          "place-masta",
          "place-rugg",
          "place-rcmnl",
          "place-jaksn",
          "place-sbmnl",
          "place-grnst",
          "place-forhl"
        ],
        "Shuttle-GovernmentCenterOakGrove": [
          "place-ogmnl",
          "place-mlmnl",
          "place-welln",
          "place-astao",
          "place-sull",
          "place-ccmnl",
          "place-north",
          "place-haecl",
          "place-state",
          "place-gover"
        ]
      },
      "1": {
        // north-bound
        "Shuttle-CopleyForestHills": [
          "place-forhl",
          "place-grnst",
          "place-sbmnl",
          "place-jaksn",
          "place-rcmnl",
          "place-rugg",
          "place-masta",
          "place-bbsta",
          "place-coecl"
        ],
        "Shuttle-GovernmentCenterOakGrove": [
          "place-gover",
          "place-north",
          "place-ccmnl",
          "place-sull",
          "place-astao",
          "place-welln",
          "place-mlmnl",
          "place-ogmnl"
        ]
      }
    },
    crStopsLists: {
      /**
       * TODO: Stop hardcoding these
       */
      "0": {
        // south-bound
        NorthOfDowntown: ["place-ogmnl", "place-mlmnl", "place-north"],
        SouthOfDowntown: ["place-bbsta", "place-rugg", "place-forhl"]
      },
      "1": {
        // north-bound
        NorthOfDowntown: ["place-north", "place-mlmnl", "place-ogmnl"],
        SouthOfDowntown: ["place-forhl", "place-rugg", "place-bbsta"]
      }
    }
  };
};

export default currentLineSuspensions;
