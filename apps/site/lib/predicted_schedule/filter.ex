defmodule PredictedSchedule.Filter do
  @moduledoc """
  Helpful functions for filtering, grouping and sorting PredictedSchedules
  """

  alias Predictions.Prediction
  alias Stops.Stop
  alias Vehicles.Vehicle

  @type enhanced_predicted_schedule :: %{
          predicted_schedule: PredictedSchedule.t(),
          time_data: time_data(),
          crowding: Vehicle.crowding() | nil
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

  @stops_without_predictions [
    "place-lake",
    "place-clmnl",
    "place-river",
    "place-hsmnl"
  ]

  @spec default_sort(PredictedSchedule.t()) ::
          {integer, non_neg_integer, non_neg_integer}
  def default_sort(%PredictedSchedule{schedule: nil, prediction: prediction}),
    do: {1, prediction.stop_sequence, to_unix(prediction.time)}

  def default_sort(%PredictedSchedule{schedule: schedule}),
    do: {2, schedule.stop_sequence, to_unix(schedule.time)}

  defp to_unix(%DateTime{} = time) do
    DateTime.to_unix(time)
  end

  defp to_unix(%NaiveDateTime{} = time) do
    time
    |> DateTime.from_naive!("Etc/UTC")
    |> to_unix()
  end

  defp to_unix(nil) do
    nil
  end

  def default_filter(predicted_schedules, now) do
    predicted_schedules
    |> Enum.reject(&PredictedSchedule.last_stop?/1)
    |> Enum.reject(&(PredictedSchedule.time(&1) == nil))
    |> Enum.reject(&(DateTime.compare(PredictedSchedule.time(&1), now) == :lt))
  end

  @doc """
  Special filtering of PredictedSchedules mainly used in TransitNearMe, where
  - we don't inadvertently omit PredictedSchedules for stops where we won't have predictions
  - if working with subway routes, returns only PredictedSchedules that have predictions
  """
  @spec by_route_with_predictions(
          [PredictedSchedule.t()],
          Routes.Route.t(),
          Stop.id_t(),
          DateTime.t()
        ) :: [
          PredictedSchedule.t()
        ]
  def by_route_with_predictions(predicted_schedules, _route, stop_id, _now)
      when stop_id in @stops_without_predictions do
    predicted_schedules
  end

  def by_route_with_predictions(predicted_schedules, %Routes.Route{type: type}, _stop_id, now)
      when type in [0, 1] do
    # subway routes should only use predictions
    predicted_schedules
    |> Enum.filter(&PredictedSchedule.has_prediction?/1)
    |> case do
      [_ | _] = predictions ->
        predictions

      [] ->
        if late_night?(now) do
          predicted_schedules
        else
          []
        end
    end
  end

  def by_route_with_predictions(predicted_schedules, %Routes.Route{}, _stop_id, %DateTime{}) do
    # all other modes can use schedules
    predicted_schedules
  end

  def late_night?(%DateTime{} = datetime) do
    time = DateTime.to_time(datetime)

    after_midnight?(time) and before_service_start?(time)
  end

  defp after_midnight?(%Time{} = time), do: Time.compare(time, ~T[00:00:00]) in [:eq, :gt]

  defp before_service_start?(%Time{} = time), do: Time.compare(time, ~T[03:00:00]) === :lt

  # @doc """
  # Special filtering of PredictedSchedules mainly used in TransitNearMe, where
  # - at least 1 result contains a prediction and up to 2 predictions are returned
  # - only 1 prediction is returned if the rest are schedules
  # - only 1 schedule if no predictions available
  # """
  # @spec by_route_with_prediction_or_schedule(
  #         [enhanced_predicted_schedule()],
  #         Routes.Route.t() | nil
  #       ) :: [enhanced_predicted_schedule()]
  # def by_route_with_prediction_or_schedule(
  #       enhanced_predicted_schedules,
  #       %Routes.Route{type: 3}
  #     ) do
  #   # for bus, remove items with a nil prediction when at least one item has a prediction
  #   any_prediction_available? =
  #     Enum.any?(enhanced_predicted_schedules, fn %{
  #                                                  predicted_schedule: predicted_schedule
  #                                                } ->
  #       PredictedSchedule.has_prediction?(predicted_schedule)
  #     end)

  #   if any_prediction_available? do
  #     enhanced_predicted_schedules
  #     |> Enum.filter(fn %{predicted_schedule: predicted_schedule} ->
  #       PredictedSchedule.has_prediction?(predicted_schedule)
  #     end)
  #     |> Enum.take(2)
  #   else
  #     enhanced_predicted_schedules
  #     |> Enum.take(2)
  #     |> by_route_with_prediction_or_schedule(nil)
  #   end
  # end

  # def by_route_with_prediction_or_schedule(
  #       [keep, %{predicted_schedule: %PredictedSchedule{prediction: nil}}],
  #       _
  #     ) do
  #   # only show one schedule if the second schedule has no prediction
  #   [keep]
  # end

  # def by_route_with_prediction_or_schedule(
  #       enhanced_predicted_schedules,
  #       _
  #     ) do
  #   enhanced_predicted_schedules
  # end

  # @doc """
  # Special filtering of PredictedSchedules mainly used in TransitNearMe, where ...
  # """
  # @spec subway_without_predictions(
  #         [enhanced_predicted_schedule()],
  #         Routes.Route.t(),
  #         Stops.Stop.id_t(),
  #         DateTime.t()
  #       ) :: [enhanced_predicted_schedule()]
  # def subway_without_predictions(
  #       enhanced_predicted_schedule,
  #       _route,
  #       stop_id,
  #       _now
  #     )
  #     when stop_id in @stops_without_predictions do
  #   enhanced_predicted_schedule
  # end

  # def subway_without_predictions(
  #       predicted_schedules_with_crowding,
  #       %Routes.Route{type: type},
  #       _stop_id,
  #       now
  #     )
  #     when type in [0, 1] do
  #   # subway routes should only use predictions
  #   predicted_schedules_with_crowding
  #   |> Enum.filter(fn %{
  #                       predicted_schedule: predicted_schedule
  #                     } ->
  #     PredictedSchedule.has_prediction?(predicted_schedule)
  #   end)
  #   |> case do
  #     [] ->
  #       if late_night?(now) do
  #         predicted_schedules_with_crowding
  #       else
  #         []
  #       end

  #     filtered_predicted_schedules_with_crowding ->
  #       filtered_predicted_schedules_with_crowding
  #   end
  # end

  # def subway_without_predictions(
  #       predicted_schedules_with_crowding,
  #       _route,
  #       _stop_id,
  #       _now
  #     ) do
  #   # all other modes can use schedules
  #   predicted_schedules_with_crowding
  # end

  # # Departures are valid if passengers can board, and the departure time is in the future
  # @spec departure_in_future([PredictedSchedule.t()], DateTime.t()) :: [PredictedSchedule.t()]
  # def departure_in_future(predicted_schedules, current_time) do
  #   predicted_schedules
  #   |> Enum.filter(&PredictedSchedule.departing?/1)
  #   |> Enum.filter(&PredictedSchedule.upcoming?(&1, current_time))
  # end
end
