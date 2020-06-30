import { assert } from "chai";
import jsdom from "mocha-jsdom";
import { TripPlannerTimeControls } from "../trip-planner-time-controls";
import { TripPlannerLocControls } from "../trip-planner-location-controls";
import AlgoliaAutocompleteWithGeo from "../algolia-autocomplete-with-geo";
import testConfig from "./../../ts/jest.config";

const { testURL } = testConfig;

const tripPlanForm = `<form id="planner-form">
        <input class="location-input" data-autocomplete="true" id="from" name="plan[from]" placeholder="Ex: 10 Park Plaza" type="text" autocomplete="off">
        <input type="hidden" id="from_latitude" name="plan[from_latitude]">
        <input type="hidden" id="from_longitude" name="plan[from_longitude]">
        <input class="location-input" data-autocomplete="true" id="to" name="plan[to]" placeholder="Ex: Boston Children's Museum" type="text" autocomplete="off">
        <div id="trip-plan-reverse-control"></div>
        <div id="trip-plan__container--to"></div>
        <div id="trip-plan__container--from"></div>
        <div id="trip-plan__required--to"></div>
        <div id="trip-plan__required--from"></div>
        <div id="trip-plan__reset--from"></div>
        <div id="trip-plan__reset--to"></div>
        <div id="powered-by-google-logo"></div>
        <div id="trip-plan__submit"></div>
        <input type="hidden" id="to_latitude" name="plan[to_latitude]">
        <input type="hidden" id="to_longitude" name="plan[to_longitude]">
      </form>`;

describe("trip-plan", () => {
  var $;
  jsdom({
    url: testURL,
    scripts: [
      "https://maps.googleapis.com/maps/api/js?libraries=places,geometry"
    ]
  });

  beforeEach(() => {
    $ = jsdom.rerequire("jquery");
    window.jQuery = jsdom.rerequire("jquery");
    window.autocomplete = jsdom.rerequire("autocomplete.js");
  });

  describe("getFriendlyTime", () => {
    it("returns a friendly string given a JavaScript date", () => {
      const date = new Date(2017, 10, 9, 8, 7);

      assert.equal(TripPlannerTimeControls.getFriendlyTime(date), "8:07 AM");
    });

    it("converts times after 13:00 to PM", () => {
      const date = new Date(2017, 10, 9, 18, 19);

      assert.equal(TripPlannerTimeControls.getFriendlyTime(date), "6:19 PM");
    });

    it("interprets 12:00 as 12:00 PM", () => {
      const date = new Date(2017, 10, 9, 12, 7);

      assert.equal(TripPlannerTimeControls.getFriendlyTime(date), "12:07 PM");
    });

    it("interprets 0:00 as 12:00 AM", () => {
      const date = new Date(2017, 10, 9, 0, 7);

      assert.equal(TripPlannerTimeControls.getFriendlyTime(date), "12:07 AM");
    });
  });

  describe("reverseTrip", () => {
    beforeEach(() => {
      const $ = jsdom.rerequire("jquery");
      window.$ = $;
      window.jQuery = $;
      $("body").append(tripPlanForm);
    });

    it("swaps the contents of to and from and the from/to lat/lng", () => {
      const tripPlannerLocControls = new TripPlannerLocControls();
      const $ = window.jQuery;
      const $from = $("#from");
      const $from_lat = $("#from_latitude");
      const $from_lng = $("#from_longitude");
      tripPlannerLocControls.fromAutocomplete.setValue("A");
      $from_lat.val(1);
      $from_lng.val(2);

      const $to = $("#to");
      const $to_lat = $("#to_latitude");
      const $to_lng = $("#to_longitude");
      tripPlannerLocControls.toAutocomplete.setValue("B");
      $to_lat.val(3);
      $to_lng.val(4);

      $("#trip-plan-reverse-control").trigger("click");
      assert.equal($from.val(), "B");
      assert.equal($to.val(), "A");
      assert.equal($to_lat.val(), 1);
      assert.equal($to_lng.val(), 2);
      assert.equal($from_lat.val(), 3);
      assert.equal($from_lng.val(), 4);
    });
  });

  describe("TripPlannerLocControls", () => {
    beforeEach(() => {
      const $ = jsdom.rerequire("jquery");
      window.$ = $;
      ``;
      window.jQuery = $;
    });

    it("can initialize without options", () => {
      $("body").append(tripPlanForm);
      const tplc = new TripPlannerLocControls();
      assert.isOk(tplc.toInput && tplc.fromInput);
      assert.isOk(tplc.toAutocomplete && tplc.fromAutocomplete);
      assert.instanceOf(tplc.toAutocomplete, AlgoliaAutocompleteWithGeo);
      assert.instanceOf(tplc.fromAutocomplete, AlgoliaAutocompleteWithGeo);
      assert.isNotOk(tplc.containerElement, "should be null but isn't");
      assert.isOk(
        tplc.toAutocomplete._autocomplete,
        "to autocomplete was not invoked"
      );
      assert.isOk(
        tplc.fromAutocomplete._autocomplete,
        "from autocomplete was not invoked"
      );
    });

    describe("when initialized with containerEl", () => {
      beforeEach(() => {
        // two forms!
        $("body").append(`
          <div class="tp one">${tripPlanForm}</div>
          <div class="tp two">${tripPlanForm}</div>
        `);
      });

      it("works within its container", () => {
        const tplc1 = new TripPlannerLocControls({
          containerEl: document.querySelector(".tp.one")
        });
        const tplc2 = new TripPlannerLocControls({
          containerEl: document.querySelector(".tp.two")
        });
        assert.isOk(tplc1.toInput && tplc1.fromInput);
        assert.isOk(tplc2.toInput && tplc2.fromInput);
        assert.isOk(tplc1.containerElement && tplc2.containerElement);
        assert.notDeepEqual(tplc1.containerElement, tplc2.containerElement);

        assert.isOk(
          tplc1.toAutocomplete._autocomplete,
          "to autocomplete was not invoked"
        );
        assert.isOk(
          tplc1.fromAutocomplete._autocomplete,
          "from autocomplete was not invoked"
        );
        assert.isOk(
          tplc2.toAutocomplete._autocomplete,
          "to autocomplete was not invoked"
        );
        assert.isOk(
          tplc2.fromAutocomplete._autocomplete,
          "from autocomplete was not invoked"
        );

        assert.notDeepEqual(
          tplc1.toAutocomplete._autocomplete,
          tplc2.toAutocomplete._autocomplete,
          "they're the same to autocomplete."
        );
        assert.notDeepEqual(
          tplc1.fromAutocomplete._autocomplete,
          tplc2.fromAutocomplete._autocomplete,
          "they're the same from autocomplete."
        );
      });

      describe("shows suggestions dropdown for", () => {
        let tplc1, tplc2;
        const suggestions = "c-search-bar__-suggestions";

        beforeEach(() => {
          tplc1 = new TripPlannerLocControls({
            containerEl: document.querySelector(".tp.one")
          });
          tplc2 = new TripPlannerLocControls({
            containerEl: document.querySelector(".tp.two")
          });
        });

        for (let widgetContainer of [".tp.one", ".tp.two"]) {
          for (let input of ["#to", "#from"]) {
            it(`${input} in ${widgetContainer}`, () => {
              document.querySelector(`${widgetContainer} ${input}`).focus();
              assert.include(
                document.querySelector(widgetContainer).innerHTML,
                suggestions,
                `${widgetContainer} didn't show dropdown`
              );

              const otherWidget =
                widgetContainer == ".tp.one" ? ".tp.two" : ".tp.one";
              assert.notInclude(
                document.querySelector(otherWidget).innerHTML,
                suggestions,
                `${widgetContainer} showed dropdown, but ${otherWidget} also showed dropdown`
              );
            });
          }
        }
      });
    });
  });
});
