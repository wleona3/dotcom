defmodule Site.RealtimeScheduleTest do
  use ExUnit.Case

  alias Alerts.Alert
  alias Alerts.InformedEntity, as: IE
  alias Alerts.InformedEntitySet, as: IESet
  alias Predictions.Prediction
  alias RoutePatterns.RoutePattern
  alias Routes.Route
  alias Schedules.{Schedule, Trip}
  alias Site.JsonHelpers
  alias Site.RealtimeSchedule
  alias Stops.Stop

  @now DateTime.from_naive!(~N[2030-02-19T12:00:00], "Etc/UTC")
  @now_departure Timex.shift(@now, minutes: 2)

  @stop %Stop{id: "place-ogmnl"}

  @route %Route{
    custom_route?: false,
    description: :rapid_transit,
    direction_destinations: %{0 => "Forest Hills", 1 => "Oak Grove"},
    direction_names: %{0 => "Southbound", 1 => "Northbound"},
    id: "Orange",
    long_name: "Orange Line",
    name: "Orange Line",
    type: 1,
    color: "ED8B00",
    sort_order: 99_999
  }

  @route_with_patterns [
    {@route,
     [
       %RoutePattern{
         direction_id: 0,
         id: "Orange-3-0",
         name: "Forest Hills",
         representative_trip_id: "40709167-20:15-OakGroveWellington",
         route_id: "Orange",
         time_desc: nil,
         typicality: 1
       },
       %RoutePattern{
         direction_id: 1,
         id: "Orange-3-1",
         name: "Oak Grove",
         representative_trip_id: "40709170-20:15-OakGroveWellington",
         route_id: "Orange",
         time_desc: nil,
         typicality: 1
       },
       %RoutePattern{
         direction_id: 0,
         id: "Orange-5-0",
         name: "Forest Hills",
         representative_trip_id: "40709151-20:15-OakGroveWellington",
         route_id: "Orange",
         time_desc: "Weekdays only",
         typicality: 3
       }
     ]}
  ]

  @trip %Trip{
    bikes_allowed?: false,
    direction_id: 1,
    headsign: "Oak Grove",
    id: "40709317",
    name: "",
    route_pattern_id: "Orange-3-1",
    shape_id: "903_0017"
  }

  @predictions [
    %Prediction{
      departing?: false,
      direction_id: 1,
      id: "prediction-40709316-70036-190",
      route: %Routes.Route{
        custom_route?: false,
        description: :rapid_transit,
        direction_destinations: %{0 => "Forest Hills", 1 => "Oak Grove"},
        direction_names: %{0 => "Southbound", 1 => "Northbound"},
        id: "Orange",
        long_name: "Orange Line",
        name: "Orange Line",
        type: 1
      },
      schedule_relationship: nil,
      status: nil,
      stop: @stop,
      stop_sequence: 190,
      arrival_time: @now,
      departure_time: @now_departure,
      time: @now,
      track: nil,
      trip: %Schedules.Trip{
        bikes_allowed?: false,
        direction_id: 1,
        headsign: "Oak Grove",
        id: "40709316",
        name: "",
        route_pattern_id: "Orange-3-1",
        shape_id: "903_0017"
      }
    },
    %Prediction{
      departing?: false,
      direction_id: 1,
      id: "prediction-40709317-70036-190",
      route: @route,
      schedule_relationship: nil,
      status: nil,
      stop_sequence: 190,
      stop: @stop,
      arrival_time: @now,
      departure_time: @now_departure,
      time: @now,
      track: nil,
      trip: @trip
    }
  ]

  @schedules [
    %Schedule{
      early_departure?: true,
      flag?: false,
      last_stop?: false,
      pickup_type: 0,
      route: @route,
      stop: @stop,
      stop_sequence: 1,
      time: @now,
      trip: @trip
    }
  ]

  @alerts [
    %Alert{
      id: "1234",
      active_period: [{@now, @now}],
      priority: :high,
      informed_entity: %IESet{
        entities: [
          %IE{route: "Orange"},
          %IE{route: "70"}
        ]
      }
    },
    %Alert{
      id: "2345",
      active_period: [{@now, @now}],
      priority: :high,
      informed_entity: %IESet{
        entities: [
          %IE{route: "Orange"},
          %IE{route: "Red"}
        ]
      }
    }
  ]

  test "stop_data/3 returns stop" do
    opts = [
      stops_fn: fn _ -> @stop end,
      routes_fn: fn _ -> @route_with_patterns end,
      predictions_fn: fn _ -> @predictions end,
      schedules_fn: fn _, _ -> @schedules end,
      alerts_fn: fn _, _ -> @alerts end
    ]

    stops = [@stop.id]

    expected = [
      %{
        stop: %{accessibility: [], address: nil, id: "place-ogmnl", name: nil, parking_lots: []},
        predicted_schedules_by_route_pattern: %{
          "Forest Hills" => %{
            direction_id: 0,
            predicted_schedules: [
              %{
                prediction: %{
                  __struct__: Predictions.Prediction,
                  departing?: false,
                  direction_id: 1,
                  id: "prediction-40709316-70036-190",
                  schedule_relationship: nil,
                  status: nil,
                  stop_sequence: 190,
                  arrival_time: @now,
                  departure_time: @now_departure,
                  time: ["arriving"],
                  track: nil,
                  headsign: "Oak Grove"
                },
                schedule: nil
              },
              %{
                prediction: %{
                  __struct__: Predictions.Prediction,
                  departing?: false,
                  direction_id: 1,
                  id: "prediction-40709317-70036-190",
                  schedule_relationship: nil,
                  status: nil,
                  stop_sequence: 190,
                  arrival_time: @now,
                  departure_time: @now_departure,
                  time: ["arriving"],
                  track: nil,
                  headsign: "Oak Grove"
                },
                schedule: nil
              }
            ]
          },
          "Oak Grove" => %{
            direction_id: 1,
            predicted_schedules: [
              %{
                prediction: %{
                  __struct__: Predictions.Prediction,
                  departing?: false,
                  direction_id: 1,
                  id: "prediction-40709316-70036-190",
                  schedule_relationship: nil,
                  status: nil,
                  stop_sequence: 190,
                  arrival_time: @now,
                  departure_time: @now_departure,
                  time: ["arriving"],
                  track: nil,
                  headsign: "Oak Grove"
                },
                schedule: nil
              },
              %{
                prediction: %{
                  __struct__: Predictions.Prediction,
                  departing?: false,
                  direction_id: 1,
                  id: "prediction-40709317-70036-190",
                  schedule_relationship: nil,
                  status: nil,
                  stop_sequence: 190,
                  arrival_time: @now,
                  departure_time: @now_departure,
                  time: ["arriving"],
                  track: nil,
                  headsign: "Oak Grove"
                },
                schedule: nil
              }
            ]
          }
        },
        route: %{
          __struct__: Routes.Route,
          alerts: @alerts |> Enum.map(&JsonHelpers.stringified_alert(&1, @now)),
          custom_route?: false,
          description: :rapid_transit,
          direction_destinations: %{"0" => "Forest Hills", "1" => "Oak Grove"},
          direction_names: %{"0" => "Southbound", "1" => "Northbound"},
          header: "Orange Line",
          id: "Orange",
          long_name: "Orange Line",
          name: "Orange Line",
          type: 1,
          color: "ED8B00",
          sort_order: 99_999
        }
      }
    ]

    RealtimeSchedule.clear_cache()
    actual = RealtimeSchedule.stop_data(stops, @now, opts)
    assert actual == expected
  end

  test "stop_data/3 returns nil" do
    opts = [
      stops_fn: fn _ -> nil end,
      routes_fn: fn _ -> [] end,
      predictions_fn: fn _ -> [] end,
      schedules_fn: fn _, _ -> [] end,
      alerts_fn: fn _, _ -> [] end
    ]

    stops = [@stop.id]

    expected = []

    RealtimeSchedule.clear_cache()
    actual = RealtimeSchedule.stop_data(stops, @now, opts)

    assert actual == expected
  end
end
