import { doWhenGoogleMapsIsReady } from "./google-maps-loaded";
import * as GoogleMapsHelpers from "./google-maps-helpers";
import Algolia from "./algolia-search";
import * as AlgoliaResult from "./algolia-result";
import AlgoliaAutocompleteWithGeo from "./algolia-autocomplete-with-geo";

export function init() {
  document.addEventListener("turbolinks:load", () => {
    doWhenGoogleMapsIsReady(() => {
      new TripPlannerLocControls();
    });
  });
}

export class TripPlannerLocControls {
  constructor({ containerEl } = {}) {
    this.containerElement = containerEl;
    this.toInput = this.getById(TripPlannerLocControls.SELECTORS.to.input);
    this.fromInput = this.getById(TripPlannerLocControls.SELECTORS.from.input);
    this.toLat = this.getById(TripPlannerLocControls.SELECTORS.to.lat);
    this.toLng = this.getById(TripPlannerLocControls.SELECTORS.to.lng);
    this.fromLat = this.getById(TripPlannerLocControls.SELECTORS.from.lat);
    this.fromLng = this.getById(TripPlannerLocControls.SELECTORS.from.lng);
    this.controller = null;

    this.markers = {
      from: null,
      to: null
    };

    this.bind();
    if (this.toInput && this.fromInput) {
      this.init();
    }
  }

  getById(id) {
    return this.containerElement
      ? this.containerElement.querySelector(`#${id}`)
      : document.getElementById(id);
  }

  init() {
    this.toController = new Algolia(
      TripPlannerLocControls.INDICES.to,
      TripPlannerLocControls.PARAMS
    );
    this.fromController = new Algolia(
      TripPlannerLocControls.INDICES.from,
      TripPlannerLocControls.PARAMS
    );
    this.toAutocomplete = new AlgoliaAutocompleteWithGeo({
      id: "trip-planner__autocomplete--to",
      selectors: TripPlannerLocControls.SELECTORS.to,
      indices: Object.keys(TripPlannerLocControls.INDICES.to),
      locationParams: { position: 1, hitLimit: 3 },
      popular: TripPlannerLocControls.POPULAR,
      parent: this,
      containerEl: this.containerElement
    });

    this.fromAutocomplete = new AlgoliaAutocompleteWithGeo({
      id: "trip-planner__autocomplete--from",
      selectors: TripPlannerLocControls.SELECTORS.from,
      indices: Object.keys(TripPlannerLocControls.INDICES.from),
      locationParams: { position: 1, hitLimit: 3 },
      popular: TripPlannerLocControls.POPULAR,
      parent: this,
      containerEl: this.containerElement
    });
    this.autocompletes = [this.toAutocomplete, this.fromAutocomplete];

    this.autocompletes.forEach(ac => {
      ac.renderFooterTemplate = this.renderFooterTemplate;
      ac.setError(null);
      ac.onHitSelected = this.onHitSelected(
        ac,
        this.getById(ac._selectors.lat),
        this.getById(ac._selectors.lng)
      );
      ac._resetButton.addEventListener("click", () => {
        this.removeMarker(ac);
      });
      ac.showLocation = this.useMyLocation(ac);
    });

    this.toController.addWidget(this.toAutocomplete);
    this.fromController.addWidget(this.fromAutocomplete);
    this.getById("trip-plan-reverse-control").addEventListener(
      "click",
      this.reverseTrip
    );
    this.setupFormValidation();
  }

  bind() {
    this.removeMarker = this.removeMarker.bind(this);
    this.reverseTrip = this.reverseTrip.bind(this);
    this.swapMarkers = this.swapMarkers.bind(this);
    this.resetResetButtons = this.resetResetButtons.bind(this);
    this.useMyLocation = this.useMyLocation.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onInvalidAddress = this.onInvalidAddress.bind(this);
    this.onAutocompleteShown = this.onAutocompleteShown.bind(this);
    this.onInputReset = this.onInputReset.bind(this);
  }

  setupFormValidation() {
    this.getById("planner-form").addEventListener("submit", this.onSubmit);

    this.autocompletes.forEach(ac => {
      this.getById(ac._selectors.input).addEventListener(
        "change",
        this.onInputChange(ac)
      );
      this.getById(ac._selectors.input).addEventListener(
        "input",
        this.onInputChange(ac)
      );
    });

    document.addEventListener("autocomplete:empty", this.onInvalidAddress);
    document.addEventListener("autocomplete:shown", this.onAutocompleteShown);
    window.$(document).on("autocomplete:reset", this.onInputReset);
  }

  onSubmit(ev) {
    const missingFrom = this.getById("from").value === "";
    const missingTo = this.getById("to").value === "";

    if (
      this.fromAutocomplete.error ||
      this.toAutocomplete.error ||
      missingFrom ||
      missingTo
    ) {
      ev.preventDefault();

      if (missingFrom) this.toggleError(this.fromAutocomplete, "missing");
      if (missingTo) this.toggleError(this.toAutocomplete, "missing");

      return false;
    }
    return true;
  }

  onAutocompleteShown({ srcElement }) {
    if (srcElement && (srcElement.id === "from" || srcElement.id === "to")) {
      const ac = this[`${srcElement.id}Autocomplete`];
      this.toggleError(ac, null);
    }
  }

  onInputReset(ev, { autocomplete }) {
    if (
      autocomplete.id === this.fromAutocomplete.id ||
      autocomplete.id === this.toAutocomplete.id
    ) {
      this.toggleError(autocomplete, null);
    }
  }

  onInputChange(ac) {
    return () => {
      if (ac.error === "invalid") {
        return;
      }

      this.toggleError(ac, null);
    };
  }

  onInvalidAddress({ srcElement }) {
    if (srcElement && (srcElement.id === "from" || srcElement.id === "to")) {
      const ac = this[`${srcElement.id}Autocomplete`];
      this.toggleError(ac, "invalid");
    }
  }

  toggleError(ac, errorType) {
    const required = this.getById(ac._selectors.required);
    const container = this.getById(ac._selectors.container);
    const input = this.getById(ac._selectors.input);
    if (required && container && input) {
      if (errorType === "missing" || errorType === "invalid") {
        container.classList.add("c-form__input-container--error");
        required.classList.remove("m-trip-plan__hidden");
        input.setAttribute("aria-invalid", "true");
      } else if (errorType === null) {
        container.classList.remove("c-form__input-container--error");
        required.classList.add("m-trip-plan__hidden");
        input.setAttribute("aria-invalid", "false");
      } else {
        throw new Error(`unrecognized error type: ${errorType}`);
      }
      ac.setError(errorType);
      TripPlannerLocControls.updateErrorContent(ac);
    }
  }

  static updateErrorContent(ac) {
    const errorContainer = document.getElementById(ac._selectors.locationError);

    if (errorContainer) {
      errorContainer.innerHTML = "";

      if (ac.error === "invalid") {
        errorContainer.innerHTML =
          "We're sorry, but we couldn't find that address.";
      }
    }
  }

  updateMarker(ac, lat, lng, title) {
    const label = ac._input.getAttribute("data-label");
    const detail = {
      latitude: lat,
      longitude: lng,
      label,
      title
    };
    const event = new Event("trip-plan:update-marker");
    event.detail = detail;
    document.dispatchEvent(event);
  }

  removeMarker(ac) {
    const label = ac._input.getAttribute("data-label");
    const detail = { label };
    const event = new Event("trip-plan:remove-marker");
    event.detail = detail;
    document.dispatchEvent(event);
  }

  resetResetButtons() {
    const from = this.fromAutocomplete;
    const to = this.toAutocomplete;
    from.resetResetButton();
    to.resetResetButton();
  }

  swapMarkers() {
    const from = this.fromAutocomplete;
    const to = this.toAutocomplete;

    const fromVal = from.getValue();
    const toVal = to.getValue();

    if (fromVal) {
      this.updateMarker(
        from,
        this.getById("from_latitude").value,
        this.getById("from_longitude").value,
        fromVal
      );
    } else {
      this.removeMarker(from);
    }

    if (toVal) {
      this.updateMarker(
        to,
        this.getById("to_latitude").value,
        this.getById("to_longitude").value,
        to
      );
    } else {
      this.removeMarker(to);
    }
  }

  useMyLocation(ac) {
    return (lat, lng) => {
      this.getById(ac._selectors.lat).value = lat;
      this.getById(ac._selectors.lng).value = lng;
      const address = ac._input.value;
      this.updateMarker(ac, lat, lng, address);
    };
  }

  onHitSelected(ac, lat, lng) {
    return ({
      originalEvent: {
        _args: [hit, type]
      }
    }) => {
      switch (type) {
        case "stops":
          this.setAutocompleteValue(
            ac,
            hit.stop.name,
            lat,
            lng,
            hit._geoloc.lat,
            hit._geoloc.lng
          );
          break;
        case "locations":
          GoogleMapsHelpers.lookupPlace(hit.address)
            .then(res => {
              ac.resetSessionToken();

              const { latitude, longitude } = res;
              this.setAutocompleteValue(
                ac,
                hit.address,
                lat,
                lng,
                latitude,
                longitude
              );
              ac._input.blur();
            })
            .catch(() => {
              // TODO: we should display an error here but NOT log to the console
            });
          break;
        case "usemylocation":
          ac.useMyLocationSearch();
          break;
        case "popular":
          this.setAutocompleteValue(
            ac,
            hit.name,
            lat,
            lng,
            hit.latitude,
            hit.longitude
          );
          break;
        default:
          console.error(`onHitSelected not implemented for ${type}.`);
      }
    };
  }

  setAutocompleteValue(ac, name, latEl, lngEl, lat, lng) {
    ac.setValue(name);
    latEl.value = lat;
    lngEl.value = lng;
    this.updateMarker(ac, lat, lng, name);
    this.resetResetButtons();
  }

  renderFooterTemplate(indexName) {
    if (indexName === "locations") {
      return AlgoliaResult.TEMPLATES.poweredByGoogleLogo.render({
        logo: document.getElementById("powered-by-google-logo").innerHTML
      });
    }
    return null;
  }

  reverseTrip(e) {
    // Prevent default click behavior bc the target area overlaps with the dropdown
    e.preventDefault();
    const fromAc = this.fromAutocomplete;
    const toAc = this.toAutocomplete;
    const fromError = fromAc.error;
    const toError = toAc.error;
    const from = fromAc.getValue();
    const to = toAc.getValue();
    const fromLat = this.getById("from_latitude").value;
    const fromLng = this.getById("from_longitude").value;
    const toLat = this.getById("to_latitude").value;
    const toLng = this.getById("to_longitude").value;
    this.getById("from_latitude").value = toLat;
    this.getById("from_longitude").value = toLng;
    this.getById("to_latitude").value = fromLat;
    this.getById("to_longitude").value = fromLng;
    fromAc.setValue(to);
    toAc.setValue(from);
    this.swapMarkers();
    this.resetResetButtons();
    this.toggleError(toAc, fromError);
    this.toggleError(fromAc, toError);
  }
}

TripPlannerLocControls.INDICES = {
  to: {
    stops: {
      indexName: "stops",
      query: ""
    }
  },
  from: {
    stops: {
      indexName: "stops",
      query: ""
    }
  }
};

TripPlannerLocControls.SELECTORS = {
  to: {
    input: "to",
    lat: "to_latitude",
    lng: "to_longitude",
    resetButton: "trip-plan__reset--to",
    container: "trip-plan__container--to",
    locationLoadingIndicator: "trip-plan__loading-indicator--to",
    required: "trip-plan__required--to",
    locationError: "trip-plan__location-error--to",
    announcer: "trip-plan__announcer--to"
  },
  from: {
    input: "from",
    lat: "from_latitude",
    lng: "from_longitude",
    resetButton: "trip-plan__reset--from",
    container: "trip-plan__container--from",
    locationLoadingIndicator: "trip-plan__loading-indicator--from",
    required: "trip-plan__required--from",
    locationError: "trip-plan__location-error--from",
    announcer: "trip-plan__announcer--from"
  },
  map: "trip-plan-map--initial"
};

TripPlannerLocControls.PARAMS = {
  stops: {
    hitsPerPage: 3,
    facets: ["*"],
    facetFilters: [[]]
  }
};

TripPlannerLocControls.POPULAR = [
  {
    icon: "airplane",
    name: "Boston Logan Airport",
    features: [],
    latitude: 42.365396,
    longitude: -71.017547,
    url: "#"
  },
  {
    icon: "station",
    name: "South Station",
    features: ["red_line", "bus", "commuter_rail", "access"],
    latitude: 42.352271,
    longitude: -71.055242,
    url: "#"
  },
  {
    icon: "station",
    name: "North Station",
    features: [
      "orange_line",
      "green-line-c",
      "green-line-e",
      "bus",
      "commuter_rail",
      "access"
    ],
    latitude: 42.365577,
    longitude: -71.06129,
    url: "#"
  }
];
