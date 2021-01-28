// npx percy exec -- node percy-screenshots.js
// remember to add the PERCY_TOKEN
// snapshot options are specified in .percy.yml

const PercyScript = require('@percy/script');

var backstop_scenarios = [
  {
    "label": "Header",
    "url": "http://host.docker.internal:8082/",
    "selectors": ["#fares"],
    "readyEvent": null,
    "delay": 1000,
    "misMatchThreshold": 0.03,
    "onReadyScript": "header.js"
  },
  {
    "label": "Commuter Rail Fares",
    "url": "http://host.docker.internal:8082/fares/commuter-rail?destination=place-WML-0214&fare_type=adult&origin=place-sstat",
    "selectors": ["main"],
    "hideSelectors": ["iframe.commuter-rail-photo-video"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Bus Schedule",
    "url": "http://host.docker.internal:8082/schedules/1/schedule?direction_id=0&trip=&origin=102",
    "hideSelectors": [".animate"],
    "removeSelectors": [".pdf-links"],
    "selectors": ["main"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Bus Map & Info",
    "url": "http://host.docker.internal:8082/schedules/1/line?direction_id=0&trip=",
    "removeSelectors": [".pdf-links"],
    "selectors": ["main"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Subway Schedule 1",
    "url": "http://host.docker.internal:8082/schedules/Red/schedule?direction_id=1&origin=place-sstat&trip=",
    "hideSelectors": [".icon-realtime"],
    "removeSelectors": [".pdf-links"],
    "selectors": ["main"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Subway Schedule Stop List",
    "url": "http://host.docker.internal:8082/schedules/Red/schedule?direction_id=1&origin=place-sstat&trip=",
    "selectors": [".modal-body"],
    "removeSelectors": [".pdf-links"],
    "readyEvent": null,
    "onReadyScript": "stop-list.js",
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Commuter Rail Schedule",
    "url": "http://host.docker.internal:8082/schedules/CR-Kingston/timetable?direction_id=0",
    "removeSelectors": [".pdf-links"],
    "selectors": [".schedule__header"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Stops List Subway",
    "url": "http://host.docker.internal:8082/stops/subway",
    "selectors": ["main"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Stops List Commuter Rail",
    "url": "http://host.docker.internal:8082/stops/commuter-rail",
    "selectors": ["main"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Commuter Rail Maps and Info Worcester",
    "url": "http://host.docker.internal:8082/schedules/CR-Kingston/line?direction_id=0",
    "selectors": [".schedule__header"],
    "removeSelectors": [".pdf-links", ".leaflet-container"],
    "delay": 1000,
    "misMatchThreshold": 0.01
  },
  {
    "label": "Retail Sales Locations",
    "url": "http://host.docker.internal:8082/fares/retail-sales-locations?latitude=42.3491637&longitude=-71.0663166",
    "selectors": ["main"],
    "hideSelectors": ["#address-search-input"],
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Search",
    "url": "http://host.docker.internal:8082/search",
    "hideSelectors": ["footer", "#animated-input-placeholder"],
    "readyEvent": null,
    "onReadyScript": "toggle-search-facets.js",
    "delay": 1000,
    "misMatchThreshold": 0.03
  },
  {
    "label": "Trip Planner Results",
    "url": "http://host.docker.internal:8082/trip-planner?_utf8=✓&plan[from]=Boston+Children's+Museum,+Congress+Street,+Boston,+MA,+USA&plan[from_latitude]=42.3518682&plan[from_longitude]=-71.04999250000003&plan[to]=Government+Center&plan[to_latitude]=42.359705&plan[to_longitude]=-71.059215&plan[time]=depart&plan[date_time][hour]=11&plan[date_time][minute]=35&plan[date_time][am_pm]=AM&plan[date_time][month]=03&plan[date_time][day]=14&plan[date_time][year]=2021&plan[modes][subway]=false&plan[modes][subway]=true&plan[modes][commuter_rail]=false&plan[modes][commuter_rail]=true&plan[modes][bus]=false&plan[modes][bus]=true&plan[modes][ferry]=false&plan[modes][ferry]=true&plan[optimize_for]=best_route#plan_result_focus",
    "hideSelectors": [".map", "footer"],
    "selectors": ["document"],
    "readyEvent": null,
    "onReadyScript": "trip-planner-results.js",
    "delay": 1000,
    "requireSameDimensions": false,
    "misMatchThreshold": 0.03
  }
]

PercyScript.run(async (page, percySnapshot) => {
  for (const scenario of backstop_scenarios) {
    const {url, label} = scenario;
    const page_url = url.replace("host.docker.internal:8082", "localhost:4001")
    await page.goto(page_url);
    await percySnapshot(label);
  };
});
