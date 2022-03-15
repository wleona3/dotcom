defmodule Site.RealtimeSchedule do
  @moduledoc """
  Struct and function for getting realtime schedule data.

  Notes:
    - predictions and schedules are indexed by route pattern name because we
      are considering route patterns with the same name to be effectively the same
  """
  use RepoCache, ttl: :timer.seconds(30)

  alias Predictions.Prediction
  alias Predictions.Repo, as: PredictionsRepo
  alias RoutePatterns.RoutePattern
  alias Routes.Repo, as: RoutesRepo
  alias Routes.Route
  alias Schedules.RepoCondensed, as: SchedulesRepo
  alias Schedules.ScheduleCondensed
  alias Site.JsonHelpers
  alias Site.TransitNearMe
  alias Stops.Repo, as: StopsRepo
  alias Stops.Stop

  import SiteWeb.StopController, only: [json_safe_alerts: 2]

  require Logger

  # the long timeout is to address a worst-case scenario of cold schedule cache
  @long_timeout 15_000

  @predicted_schedules_per_stop 2

  @default_opts [
    stops_fn: &StopsRepo.get/1,
    routes_fn: &RoutesRepo.by_stop_with_route_pattern/1,
    predictions_fn: &PredictionsRepo.all_no_cache/1,
    schedules_fn: &SchedulesRepo.by_route_ids/2,
    alerts_fn: &Alerts.Repo.by_route_ids/2
  ]

  @type route_with_patterns_t :: {
          Stop.id_t(),
          Route.t(),
          [RoutePattern.t()]
        }

  @type route_pattern_name_t :: String.t()

  @spec stop_data([Stop.id_t()], DateTime.t(), Keyword.t()) :: [map]
  def stop_data(stop_ids, now, opts \\ []) do
    cache(stop_ids, fn _ ->
      do_stop_data(stop_ids, now, opts)
    end)
  end

  @spec do_stop_data([Stop.id_t()], DateTime.t(), Keyword.t()) :: [map]
  defp do_stop_data(stop_ids, now, opts) do
    opts = Keyword.merge(@default_opts, opts)
    stops_fn = Keyword.fetch!(opts, :stops_fn)
    routes_fn = Keyword.fetch!(opts, :routes_fn)
    predictions_fn = Keyword.fetch!(opts, :predictions_fn)
    schedules_fn = Keyword.fetch!(opts, :schedules_fn)
    alerts_fn = Keyword.fetch!(opts, :alerts_fn)

    # stage 1, get routes
    routes_task = Task.async(fn -> get_routes(stop_ids, routes_fn) end)
    route_with_patterns = Task.await(routes_task)

    # stage 2, get stops, predictions, schedules, and alerts
    stops_task = Task.async(fn -> get_stops(stop_ids, stops_fn) end)
    predictions_task = Task.async(fn -> get_predictions(route_with_patterns, predictions_fn) end)
    schedules_task = Task.async(fn -> get_schedules(route_with_patterns, now, schedules_fn) end)

    alerts_task = Task.async(fn -> get_alerts(route_with_patterns, now, alerts_fn) end)

    [stops, predictions, schedules, alerts] =
      Enum.map(
        [stops_task, predictions_task, schedules_task, alerts_task],
        &Task.await(&1, @long_timeout)
      )

    build_output(stops, route_with_patterns, schedules, predictions, alerts, now)
  end

  @spec get_stops([Stop.id_t()], fun()) :: map
  defp get_stops(stop_ids, stops_fn) do
    stop_ids
    |> Enum.map(
      &Task.async(fn ->
        {&1, &1 |> stops_fn.() |> stop_fields()}
      end)
    )
    |> Enum.into(%{}, &Task.await/1)
  end

  @spec stop_fields(Stop.t() | nil) :: map
  defp stop_fields(nil) do
    %{}
  end

  defp stop_fields(stop) do
    Map.take(stop, [:id, :name, :accessibility, :address, :parking_lots])
  end

  @spec get_routes([Stop.id_t()], fun()) :: [route_with_patterns_t]
  defp get_routes(stop_ids, routes_fn) do
    stop_ids
    |> Enum.map(
      &Task.async(fn ->
        &1
        |> routes_fn.()
        |> Enum.map(fn {route, route_patterns} ->
          {&1, JsonHelpers.stringified_route(route), route_patterns}
        end)
      end)
    )
    |> Enum.map(&Task.await/1)
    |> List.flatten()
  end

  defp get_alerts(route_with_patterns, now, alerts_fn) do
    route_with_patterns
    |> Enum.map(fn {_stop_id, route, _patterns} ->
      {route.id,
       Task.async(fn -> get_high_priority_alerts_for_route(route.id, now, alerts_fn) end)}
    end)
    |> Enum.into(%{}, fn {route_id, task} -> {route_id, Task.await(task)} end)
  end

  defp get_high_priority_alerts_for_route(route_id, now, alerts_fn) do
    [route_id]
    |> alerts_fn.(now)
    |> Enum.filter(&Alerts.Alert.is_high_severity_or_high_priority(&1))
    |> json_safe_alerts(now)
  end

  @spec get_predictions([route_with_patterns_t], fun()) :: map
  defp get_predictions(route_with_patterns, predictions_fn) do
    route_with_patterns
    |> Enum.map(fn {stop_id, _route, route_patterns} ->
      Task.async(fn ->
        do_get_predictions(stop_id, route_patterns, predictions_fn)
      end)
    end)
    |> Enum.flat_map(&Task.await(&1, @long_timeout))
    |> Enum.reduce(%{}, fn {route_key, predictions}, accumulator ->
      data =
        if Map.has_key?(accumulator, route_key) do
          accumulator
          |> Map.get(route_key)
          |> Enum.concat(predictions)
          |> Enum.sort_by(& &1.time, &date_sorter/2)
        else
          predictions
        end

      Map.put(accumulator, route_key, data)
    end)
  end

  @spec date_sorter(DateTime.t(), DateTime.t()) :: boolean
  defp date_sorter(date1, date2) do
    case DateTime.compare(date1, date2) do
      :lt -> true
      :eq -> true
      :gt -> false
    end
  end

  @spec do_get_predictions(Stop.id_t(), [RoutePattern.t()], fun()) :: [
          {
            route_pattern_name_t,
            [Prediction.t()]
          }
        ]
  defp do_get_predictions(stop_id, route_patterns, predictions_fn) do
    route_patterns
    |> Enum.map(fn route_pattern ->
      key = route_pattern_key(route_pattern, stop_id)

      Task.async(fn ->
        next_two_predictions =
          [
            stop: stop_id,
            route_pattern: route_pattern.id,
            sort: "time",
            "page[limit]": @predicted_schedules_per_stop
          ]
          |> predictions_fn.()
          |> Enum.filter(& &1.time)

        {key, next_two_predictions}
      end)
    end)
    |> Enum.map(&Task.await(&1, @long_timeout))
  end

  @spec get_schedules([route_with_patterns_t], DateTime.t(), fun()) :: map
  defp get_schedules(route_with_patterns, now, schedules_fn) do
    route_with_patterns
    |> Enum.map(fn {stop_id, route, route_patterns} ->
      Task.async(fn ->
        do_get_schedules(route.id, stop_id, route_patterns, now, schedules_fn)
      end)
    end)
    |> Enum.flat_map(&Task.await(&1, @long_timeout))
    |> Enum.into(%{})
  end

  @spec do_get_schedules(String.t(), Stop.id_t(), [route_with_patterns_t], DateTime.t(), fun()) ::
          map
  defp do_get_schedules(route_id, stop_id, route_patterns, now, schedules_fn) do
    route_pattern_dictionary = make_route_pattern_dictionary(route_patterns, stop_id)

    [route_id]
    |> schedules_fn.(min_time: now)
    |> Enum.filter(&if Map.has_key?(&1, :stop_id), do: &1.stop_id == stop_id, else: false)
    |> Enum.group_by(& &1.route_pattern_id)
    |> Enum.into(
      %{},
      fn {route_pattern_id, schedules} ->
        {Map.get(route_pattern_dictionary, route_pattern_id),
         Enum.take(schedules, @predicted_schedules_per_stop)}
      end
    )
  end

  @spec route_pattern_key(RoutePattern.t(), String.t()) :: String.t()
  defp route_pattern_key(route_pattern, stop_id) do
    "#{route_pattern.route_id}-#{stop_id}-#{route_pattern.name}"
  end

  @spec make_route_pattern_dictionary([RoutePattern.t()], String.t()) :: map
  defp make_route_pattern_dictionary(route_patterns, stop_id) do
    Enum.into(route_patterns, %{}, &{&1.id, route_pattern_key(&1, stop_id)})
  end

  @spec build_output(map, [route_with_patterns_t], map, map, map, DateTime.t()) :: [map]
  defp build_output(stops, route_with_patterns, schedules, predictions, alerts, now) do
    route_with_patterns
    |> Enum.map(fn {stop_id, route, route_patterns} ->
      unique_route_patterns = make_route_patterns_unique(route_patterns, stop_id)
      alerts = Map.get(alerts, route.id, [])

      %{
        stop: stops[stop_id],
        route: route |> Map.put(:alerts, alerts),
        predicted_schedules_by_route_pattern:
          build_predicted_schedules_by_route_pattern(
            stop_id,
            unique_route_patterns,
            schedules,
            predictions,
            now
          )
      }
    end)
  end

  @spec make_route_patterns_unique([RoutePattern.t()], String.t()) :: [RoutePattern.t()]
  defp make_route_patterns_unique(route_patterns, stop_id) do
    Enum.uniq_by(route_patterns, &route_pattern_key(&1, stop_id))
  end

  @spec build_predicted_schedules_by_route_pattern(
          String.t(),
          [RoutePattern.t()],
          map,
          map,
          DateTime.t()
        ) ::
          map
  defp build_predicted_schedules_by_route_pattern(
         stop_id,
         route_patterns,
         schedules_by_route_pattern,
         predictions_by_route_pattern,
         now
       ) do
    route_patterns
    |> Enum.map(fn %{name: name, direction_id: direction_id} = route_pattern ->
      key = route_pattern_key(route_pattern, stop_id)
      schedules = Map.get(schedules_by_route_pattern, key, [])
      predictions = Map.get(predictions_by_route_pattern, key, [])

      {name, direction_id,
       predictions
       |> PredictedSchedule.group(schedules)
       |> Enum.slice(0, 2)
       |> Enum.map(&shrink_predicted_schedule(&1, now))}
    end)
    |> Enum.filter(fn {_name, _direction_id, predicted_schedules} ->
      !Enum.empty?(predicted_schedules)
    end)
    |> Enum.into(%{}, fn {name, direction_id, predicted_schedules} ->
      {name, %{direction_id: direction_id, predicted_schedules: predicted_schedules}}
    end)
  end

  @spec shrink_predicted_schedule(PredictedSchedule.t(), DateTime.t()) :: map
  defp shrink_predicted_schedule(%{schedule: schedule, prediction: prediction}, now) do
    _ = log_warning_if_missing_trip(prediction)

    %{
      prediction:
        prediction
        |> format_prediction_time(now)
        |> add_trip_headsign()
        |> do_shrink_predicted_schedule(),
      schedule: schedule |> format_schedule_time() |> do_shrink_predicted_schedule()
    }
  end

  def log_warning_if_missing_trip(prediction) do
    _ =
      if prediction && prediction.trip == nil do
        Logger.warn("prediction_without_trip prediction=#{inspect(prediction)}")
      end
  end

  @spec add_trip_headsign(map) :: map | nil
  defp add_trip_headsign(nil), do: nil

  defp add_trip_headsign(%{trip: trip} = prediction) do
    Map.put(prediction, :headsign, trip.headsign)
  end

  @spec do_shrink_predicted_schedule(Prediction.t() | ScheduleCondensed.t() | nil) :: map | nil
  defp do_shrink_predicted_schedule(nil), do: nil

  defp do_shrink_predicted_schedule(prediction_or_schedule),
    do: Map.drop(prediction_or_schedule, [:stop, :trip, :route, :stop_id, :trip_id])

  @spec format_prediction_time(map | nil, DateTime.t()) :: map | nil
  defp format_prediction_time(nil, _), do: nil

  defp format_prediction_time(prediction, now) do
    seconds = DateTime.diff(prediction.time, now)
    route_type = Route.type_atom(prediction.route)

    %{
      prediction
      | time: TransitNearMe.format_prediction_time(prediction.time, now, route_type, seconds)
    }
  end

  @spec format_schedule_time(map | nil) :: map | nil
  defp format_schedule_time(nil), do: nil

  defp format_schedule_time(%{time: time} = schedule),
    do: %{schedule | time: TransitNearMe.format_time(time)}
end
