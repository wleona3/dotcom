defmodule Site.TransitNearMe do
  @moduledoc """
  Struct and helper functions for gathering data to use on TransitNearMe.
  """

  require Logger

  alias GoogleMaps.Geocode.Address
  alias Routes.Route
  alias Schedules.{Schedule, Trip}
  alias SiteWeb.ViewHelpers
  alias Stops.{Nearby, Stop}
  alias Util.Distance

  defstruct stops: [],
            distances: %{},
            schedules: %{}

  @type schedule_data :: %{
          Route.id_t() => %{
            Trip.headsign() => Schedule.t()
          }
        }

  @type distance_hash :: %{Stop.id_t() => float}

  @type t :: %__MODULE__{
          stops: [Stop.t()],
          distances: distance_hash,
          schedules: %{Stop.id_t() => schedule_data}
        }

  @type stops_with_distances :: %{
          stops: [Stop.t()],
          distances: distance_hash
        }

  @type error :: {:error, :timeout | :no_stops}

  @default_opts [
    stops_nearby_fn: &Nearby.nearby_with_varying_radius_by_mode/1,
    schedules_fn: &Schedules.Repo.schedule_for_stop/2
  ]

  @spec build(Address.t(), Keyword.t()) :: stops_with_distances
  def build(%Address{} = location, opts) do
    opts = Keyword.merge(@default_opts, opts)
    nearby_fn = Keyword.fetch!(opts, :stops_nearby_fn)
    stops = nearby_fn.(location)

    %{
      stops: stops,
      distances:
        Map.new(
          stops,
          &{&1.id, &1 |> Distance.haversine(location) |> ViewHelpers.round_distance()}
        )
    }
  end

  @spec get_direction_map([PredictedSchedule.t()], Keyword.t()) :: [direction_data]
  def get_direction_map(predicted_schedules, opts) do
    predicted_schedules
    |> Enum.group_by(&PredictedSchedule.direction_id/1)
    |> Enum.map(&build_direction_map(&1, opts))
    |> sort_by_time()
    |> elem(1)
  end

  @spec sort_by_time([
          {DateTime.t() | nil, [direction_data] | [PredictedSchedule.to_headsign_data()]}
        ]) ::
          {DateTime.t() | nil, [direction_data] | [PredictedSchedule.to_headsign_data()]}

  defp sort_by_time([]) do
    {nil, []}
  end

  defp sort_by_time(list) do
    {[closest_time | _], sorted} =
      list
      |> Enum.sort_by(fn
        {nil, _data} -> nil
        {time, _data} -> DateTime.to_unix(time)
      end)
      |> Enum.unzip()

    {closest_time, sorted}
  end

  @type direction_data :: %{
          required(:direction_id) => 0 | 1,
          required(:headsigns) => [PredictedSchedule.to_headsign_data()]
        }

  @spec build_direction_map({0 | 1, [PredictedSchedule.t()]}, Keyword.t()) ::
          {DateTime.t(), direction_data}
  defp build_direction_map({direction_id, [ps | _] = predicted_schedules}, opts) do
    now = Keyword.fetch!(opts, :now)

    route = PredictedSchedule.route(ps)

    stop_id =
      ps
      |> PredictedSchedule.stop()
      |> Stops.Repo.get_parent()
      |> Map.fetch!(:id)

    {closest_time, headsigns} =
      predicted_schedules
      |> PredictedSchedule.Filter.by_route_with_predictions(route, stop_id, now)
      |> Enum.take(schedule_count(route))
      |> filter_headsign_schedules(route)
      |> build_headsign_map()

    {
      closest_time,
      %{
        direction_id: direction_id,
        headsigns: headsigns
      }
    }
  end

  @spec build_headsign_map([PredictedSchedule.t()]) ::
          {DateTime.t(), [PredictedSchedule.to_headsign_data()]}
  defp build_headsign_map([]), do: {nil, []}

  defp build_headsign_map(predicted_schedules) do
    sorted_predicted_schedules =
      predicted_schedules
      |> Enum.sort_by(fn ps ->
        case PredictedSchedule.time(ps) do
          nil -> nil
          time -> DateTime.to_unix(time)
        end
      end)

    [soonest | _] = sorted_predicted_schedules

    {
      PredictedSchedule.time(soonest),
      Enum.map(sorted_predicted_schedules, &PredictedSchedule.to_headsign_data(&1))
    }
  end

  def schedule_count(%Route{type: 2}), do: 1
  # get more bus schedules because some will be dropped later
  def schedule_count(%Route{type: 3}), do: 4
  def schedule_count(%Route{}), do: 2

  @spec filter_headsign_schedules([PredictedSchedule.t()], Route.t() | nil) :: [
          PredictedSchedule.t()
        ]
  def filter_headsign_schedules(predicted_schedules, %Route{type: 3}) do
    # for bus, remove items with a nil prediction when at least one item has a prediction
    prediction_available? = Enum.any?(predicted_schedules, &PredictedSchedule.has_prediction?(&1))

    if prediction_available? do
      predicted_schedules
      |> Enum.filter(&PredictedSchedule.has_prediction?(&1))
      |> Enum.take(2)
    else
      predicted_schedules
      |> Enum.take(2)
      |> filter_headsign_schedules(nil)
    end
  end

  def filter_headsign_schedules(
        [%PredictedSchedule{} = keep, %PredictedSchedule{prediction: nil}],
        _
      ) do
    # only show one schedule if the second schedule has no prediction
    [keep]
  end

  def filter_headsign_schedules(schedules, _) do
    schedules
  end

  @spec after_min_time?(PredictedSchedule.t(), DateTime.t()) :: boolean
  def after_min_time?(%PredictedSchedule{} = predicted_schedule, min_time) do
    case PredictedSchedule.time(predicted_schedule) do
      %DateTime{} = time ->
        DateTime.compare(time, min_time) != :lt

      nil ->
        false
    end
  end
end
