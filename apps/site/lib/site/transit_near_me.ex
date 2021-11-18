defmodule Site.TransitNearMe do
  @moduledoc """
  Struct and helper functions for gathering data to use on TransitNearMe.
  """

  require Logger

  alias GoogleMaps.Geocode.Address
  alias PredictedSchedule.Display
  alias Predictions.Prediction
  alias Routes.Route
  alias Schedules.{Schedule, Trip}
  alias SiteWeb.ViewHelpers
  alias Stops.{Nearby, Stop}
  alias Util.Distance
  alias Vehicles.Vehicle

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

  @type enhanced_time_data_by_stop :: %{
          Stop.id_t() => [enhanced_time_data()]
        }

  @type enhanced_time_data :: %{
          # Headsign name
          name: String.t(),
          time_data_with_crowding_list: [
            time_data_with_crowding()
          ],
          train_number: String.t() | nil
        }

  @type time_data_with_crowding :: %{
          time_data: time_data(),
          crowding: Vehicle.crowding() | nil,
          predicted_schedule: PredictedSchedule
        }

  @type time_data :: %{
          required(:scheduled_time) => [String.t()] | nil,
          required(:prediction) => simple_prediction() | nil,
          required(:delay) => integer
        }

  @type simple_prediction :: %{
          required(:seconds) => integer,
          required(:time) => [String.t()],
          required(:status) => String.t() | nil,
          required(:track) => String.t() | nil,
          required(:schedule_relationship) => Prediction.schedule_relationship()
        }

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

  # @doc """
  # Gets all schedules for a route and compiles appropriate headsign_data for each stop.
  # Returns a map indexed by stop_id
  # """
  # @spec time_data_for_route_by_stop(Route.id_t(), 1 | 0, Keyword.t()) ::
  #         enhanced_time_data_by_stop()
  # def time_data_for_route_by_stop(route_id, direction_id, opts) do
  #   # _date = Keyword.get(opts, :date, Util.service_date())
  #   # _schedules_fn = Keyword.get(opts, :schedules_fn, &Schedules.Repo.by_route_ids/2)
  #   opts = Keyword.put(opts, :direction_id, direction_id)
  #   now = Keyword.fetch!(opts, :now)

  #   PredictedSchedule.Repo.get(route_id, nil, opts)
  #   |> Enum.filter(&(!PredictedSchedule.last_stop?(&1) and after_min_time?(&1, now)))
  #   |> with_time_data_and_crowding(opts)
  #   |> map_to_enhanced_time_data_by_stop(opts)
  # end

  @spec build_time_map(PredictedSchedule.t(), Keyword.t()) :: predicted_schedule_and_time_data
  def build_time_map(%PredictedSchedule{} = predicted_schedule, opts) do
    now = Keyword.fetch!(opts, :now)

    route_type =
      predicted_schedule
      |> PredictedSchedule.route()
      |> Route.type_atom()

    {
      predicted_schedule,
      %{
        delay: PredictedSchedule.delay(predicted_schedule),
        scheduled_time: scheduled_time(predicted_schedule),
        prediction: simple_prediction(predicted_schedule.prediction, route_type, now)
      }
    }
  end

  @spec format_prediction_time(DateTime.t(), DateTime.t(), atom, integer) ::
          [String.t()] | String.t()
  def format_prediction_time(%DateTime{} = time, _now, :commuter_rail, _) do
    format_time(time)
  end

  def format_prediction_time(%DateTime{} = time, now, :subway, seconds) when seconds > 30 do
    Display.do_time_difference(time, now, &format_time/1, 120)
  end

  def format_prediction_time(_, _, :subway, _), do: ["arriving"]

  def format_prediction_time(%DateTime{} = time, now, :bus, seconds) when seconds > 60 do
    Display.do_time_difference(time, now, &format_time/1, 120)
  end

  def format_prediction_time(_, _, :bus, _), do: ["arriving"]

  @spec format_time(DateTime.t()) :: [String.t()]
  def format_time(time) do
    [time, am_pm] =
      time
      |> Timex.format!("{h12}:{m} {AM}")
      |> String.split(" ")

    [time, " ", am_pm]
  end

  @spec sort_by_time([{DateTime.t() | nil, any}]) ::
          {DateTime.t() | nil, [any]}

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

  @type headsign_data :: %{
          required(:name) => String.t(),
          required(:times) => [time_data],
          required(:train_number) => String.t() | nil
        }

  @type direction_data :: %{
          required(:direction_id) => 0 | 1,
          required(:headsigns) => [headsign_data]
        }

  @spec build_direction_map({0 | 1, [PredictedSchedule.t()]}, Keyword.t()) ::
          {DateTime.t(), direction_data}
  def build_direction_map({direction_id, [ps | _] = predicted_schedules}, opts) do
    headsign_fn = Keyword.get(opts, :headsign_fn, &build_headsign_map/2)
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
      |> Enum.group_by(&((trip = PredictedSchedule.trip(&1)) && trip.headsign))
      |> Enum.map(fn {headsign, predicted_scheds} ->
        predicted_scheds =
          Enum.sort_by(predicted_scheds, &PredictedSchedule.Filter.default_sort/1)

        headsign_fn.({headsign, predicted_scheds}, opts)
      end)
      |> sort_by_time()

    {
      closest_time,
      %{
        direction_id: direction_id,
        headsigns: headsigns
      }
    }
  end

  @spec build_headsign_map(
          {Schedules.Trip.headsign(), [PredictedSchedule.t()]},
          Keyword.t()
        ) :: {DateTime.t(), headsign_data}
  defp build_headsign_map({headsign, [ps | _] = predicted_schedules}, opts) do
    route = PredictedSchedule.route(ps)
    trip = PredictedSchedule.trip(ps)

    {[soonest | _], headsign_schedules} =
      predicted_schedules
      |> Enum.take(schedule_count(route))
      |> Enum.map(&build_time_map(&1, opts))
      |> filter_headsign_schedules(route)
      |> Enum.unzip()

    {
      PredictedSchedule.time(soonest),
      %{
        name: headsign && ViewHelpers.break_text_at_slash(headsign),
        times: headsign_schedules,
        train_number: trip && trip.name
      }
    }
  end

  def schedule_count(%Route{type: 2}), do: 1
  # get more bus schedules because some will be dropped later
  def schedule_count(%Route{type: 3}), do: 4
  def schedule_count(%Route{}), do: 2

  @type predicted_schedule_and_time_data :: {PredictedSchedule.t(), time_data}

  @spec filter_headsign_schedules([predicted_schedule_and_time_data], Route.t() | nil) :: [
          predicted_schedule_and_time_data
        ]
  def filter_headsign_schedules(schedules, %Route{type: 3}) do
    # for bus, remove items with a nil prediction when at least one item has a prediction
    prediction_available? =
      Enum.any?(schedules, &(&1 |> elem(0) |> PredictedSchedule.has_prediction?()))

    if prediction_available? do
      schedules
      |> Enum.filter(&(&1 |> elem(0) |> PredictedSchedule.has_prediction?()))
      |> Enum.take(2)
    else
      schedules
      |> Enum.take(2)
      |> filter_headsign_schedules(nil)
    end
  end

  def filter_headsign_schedules(
        [{%PredictedSchedule{}, _} = keep, {%PredictedSchedule{prediction: nil}, _}],
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

  # @type enhanced_predicted_schedule :: %{
  #         predicted_schedule: PredictedSchedule.t(),
  #         time_data: time_data(),
  #         crowding: Vehicle.crowding() | nil
  #       }
  # @spec with_time_data_and_crowding([PredictedSchedule.t()], keyword()) :: [
  #         enhanced_predicted_schedule()
  #       ]
  # def with_time_data_and_crowding(predicted_schedules, opts) do
  #   now = Keyword.fetch!(opts, :now)

  #   Enum.map(predicted_schedules, fn predicted_schedule ->
  #     route_type =
  #       predicted_schedule
  #       |> PredictedSchedule.route()
  #       |> Route.type_atom()

  #     %{
  #       predicted_schedule: predicted_schedule,
  #       time_data: %{
  #         delay: PredictedSchedule.delay(predicted_schedule),
  #         scheduled_time: scheduled_time(predicted_schedule),
  #         prediction: simple_prediction(predicted_schedule.prediction, route_type, now)
  #       },
  #       crowding: crowding_for_predicted_schedule(predicted_schedule)
  #     }
  #   end)
  # end

  # @spec map_to_enhanced_time_data_by_stop(
  #         [enhanced_predicted_schedule()],
  #         keyword()
  #       ) ::
  #         enhanced_time_data_by_stop()
  # def map_to_enhanced_time_data_by_stop(enhanced_predicted_schedules, opts) do
  #   enhanced_predicted_schedules
  #   |> Enum.group_by(&PredictedSchedule.stop(&1.predicted_schedule).id)
  #   |> Map.new(&filtered_time_data_from_predicted_schedule(&1, opts))
  # end

  # @spec filtered_time_data_from_predicted_schedule(
  #         {Stop.id_t(), [enhanced_predicted_schedule()]},
  #         keyword()
  #       ) ::
  #         {Stop.id_t(), [enhanced_time_data()]}
  # defp filtered_time_data_from_predicted_schedule(
  #        {stop_id,
  #         [%{predicted_schedule: predicted_schedule} | _] = enhanced_predicted_schedules},
  #        opts
  #      ) do
  #   now = Keyword.fetch!(opts, :now)
  #   route = PredictedSchedule.route(predicted_schedule)

  #   enhanced_time_data_list =
  #     enhanced_predicted_schedules
  #     |> PredictedSchedule.Filter.subway_without_predictions(route, stop_id, now)
  #     |> time_data_from_predicted_schedule()
  #     |> sort_by_time()
  #     |> elem(1)
  #     |> Enum.take(2)

  #   {stop_id, enhanced_time_data_list}
  # end

  # @spec time_data_from_predicted_schedule([enhanced_predicted_schedule()]) ::
  #         [
  #           {DateTime.t() | nil, enhanced_time_data()}
  #         ]
  # defp time_data_from_predicted_schedule(enhanced_predicted_schedules) do
  #   enhanced_predicted_schedules
  #   |> Enum.group_by(&PredictedSchedule.trip(&1.predicted_schedule))
  #   |> Enum.flat_map(fn {trip, enhanced_predicted_schedules} ->
  #     enhanced_predicted_schedules
  #     |> Enum.group_by(&headsign_for_enhanced_predicted_schedule/1)
  #     |> Enum.map(fn {headsign, enhanced_predicted_schedules} ->
  #       route =
  #         enhanced_predicted_schedules
  #         |> List.first()
  #         |> Map.get(:predicted_schedule)
  #         |> PredictedSchedule.route()

  #       filtered_time_data_with_crowding_list =
  #         enhanced_predicted_schedules
  #         |> Enum.sort_by(
  #           &(&1.predicted_schedule
  #             |> PredictedSchedule.time()
  #             |> DateTime.to_unix())
  #         )
  #         |> Enum.take(schedule_count(route))
  #         |> PredictedSchedule.Filter.by_route_with_prediction_or_schedule(route)

  #       first_predicted_schedule_time =
  #         filtered_time_data_with_crowding_list
  #         |> List.first()
  #         |> Map.get(:predicted_schedule)
  #         |> PredictedSchedule.time()

  #       {first_predicted_schedule_time,
  #        %{
  #          name: headsign && ViewHelpers.break_text_at_slash(headsign),
  #          time_data_with_crowding_list: filtered_time_data_with_crowding_list,
  #          train_number: trip && trip.name
  #        }}
  #     end)
  #   end)
  # end

  # @spec headsign_for_enhanced_predicted_schedule(enhanced_predicted_schedule()) ::
  #         String.t() | nil
  # defp headsign_for_enhanced_predicted_schedule(enhanced_predicted_schedule) do
  #   case PredictedSchedule.trip(enhanced_predicted_schedule.predicted_schedule) do
  #     %Trip{headsign: headsign} ->
  #       headsign

  #     _ ->
  #       nil
  #   end
  # end

  # @spec crowding_for_predicted_schedule(PredictedSchedule.t()) :: Vehicle.crowding() | nil
  # defp crowding_for_predicted_schedule(predicted_schedule) do
  #   with %Trip{id: trip_id} <- PredictedSchedule.trip(predicted_schedule),
  #        %Vehicle{crowding: crowding} <- Vehicles.Repo.trip(trip_id) do
  #     crowding
  #   else
  #     _ ->
  #       nil
  #   end
  # end

  defp scheduled_time(%PredictedSchedule{schedule: %Schedule{time: time}}) do
    format_time(time)
  end

  defp scheduled_time(%PredictedSchedule{}) do
    nil
  end

  @spec simple_prediction(Prediction.t() | nil, atom, DateTime.t()) :: simple_prediction | nil
  def simple_prediction(nil, _route_type, _now) do
    nil
  end

  def simple_prediction(%Prediction{time: nil}, _route_type, _now) do
    nil
  end

  def simple_prediction(%Prediction{time: %DateTime{}} = prediction, route_type, now) do
    seconds = DateTime.diff(prediction.time, now)

    prediction
    |> Map.take([:status, :track, :schedule_relationship])
    |> Map.put(:time, format_prediction_time(prediction.time, now, route_type, seconds))
    |> Map.put(:seconds, seconds)
  end
end
