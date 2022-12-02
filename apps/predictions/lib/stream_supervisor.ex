defmodule Predictions.StreamSupervisor do
  @moduledoc """
  DynamicSupervisor managing per-route streams of predictions from the API.
  """

  use DynamicSupervisor

  alias Predictions.PredictionsPubSub

  @spec start_link(keyword()) :: Supervisor.on_start()
  def start_link(opts), do: DynamicSupervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl DynamicSupervisor
  def init(_) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @spec ensure_stream_is_started(PredictionsPubSub.prediction_key()) :: {:ok, pid()} | :bypassed
  def ensure_stream_is_started(route_and_stop_id),
    do: ensure_stream_is_started(route_and_stop_id, System.get_env("USE_SERVER_SENT_EVENTS"))

  defp ensure_stream_is_started(_route_and_stop_id, "false"), do: :bypassed

  defp ensure_stream_is_started(route_and_stop_id, _) do
    case lookup(route_and_stop_id) do
      nil ->
        start_stream(route_and_stop_id)

      pid ->
        {:ok, pid}
    end
  end

  @spec lookup(PredictionsPubSub.prediction_key()) :: pid() | nil
  defp lookup(route_and_stop_id) do
    case Registry.lookup(:prediction_streams_registry, route_and_stop_id) do
      [{pid, _}] -> if Process.alive?(pid), do: pid
      _ -> nil
    end
  end

  @spec start_stream(PredictionsPubSub.prediction_key()) :: {:ok, pid()}
  defp start_stream(route_and_stop_id) do
    with {:ok, sses_pid} <-
           DynamicSupervisor.start_child(
             __MODULE__,
             {ServerSentEventStage, sses_opts(route_and_stop_id)}
           ),
         api_stream_name <- api_stream_name(route_and_stop_id),
         sses_stream_name <- sses_stream_name(route_and_stop_id),
         {:ok, _api_stream_pid} <-
           DynamicSupervisor.start_child(
             __MODULE__,
             {V3Api.Stream, name: api_stream_name, subscribe_to: sses_stream_name}
           ),
         {:ok, _predictions_stream_pid} <-
           DynamicSupervisor.start_child(
             __MODULE__,
             {Predictions.Stream, subscribe_to: api_stream_name}
           ) do
      Registry.register(:prediction_streams_registry, route_and_stop_id, sses_pid)
      {:ok, sses_pid}
    else
      {:error, {:already_started, pid}} ->
        {:ok, pid}
    end
  end

  @spec sses_opts(PredictionsPubSub.prediction_key()) :: Keyword.t()
  defp sses_opts(route_and_stop_id) do
    [route_id, stop_id] = String.split(route_and_stop_id, "@")

    path =
      "/predictions?filter[route]=#{route_id}&filter[stop]=#{stop_id}&fields[prediction]=status,departure_time,arrival_time,direction_id,schedule_relationship,stop_sequence&include=route,trip,trip.occupancies,stop&fields[route]=long_name,short_name,type&fields[trip]=direction_id,headsign,name,bikes_allowed&fields[stop]=platform_code"

    sses_opts =
      V3Api.Stream.build_options(
        name: sses_stream_name(route_and_stop_id),
        path: path
      )

    sses_opts
  end

  @spec sses_stream_name(PredictionsPubSub.prediction_key()) :: atom()
  defp sses_stream_name(route_and_stop_id), do: :"predictions_sses_stream_#{route_and_stop_id}"

  @spec api_stream_name(PredictionsPubSub.prediction_key()) :: atom()
  defp api_stream_name(route_and_stop_id), do: :"predictions_api_stream_#{route_and_stop_id}"
end
