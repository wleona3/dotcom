defmodule Predictions.PredictionsPubSub do
  @moduledoc """
  Allow channels to subscribe to prediction streams, which are collected into a
  Map with keys representing route-stop pairs as "<route-id>@<parent-stop-id>"
  """

  use GenServer

  alias Predictions.{Prediction, StreamSupervisor}
  alias Routes.Route
  alias Stops.Stop

  defstruct predictions_by_key: %{}

  @type t :: %__MODULE__{
          predictions_by_key: predictions_by_key()
        }

  @type prediction_key :: String.t()
  @type predictions_by_key :: %{prediction_key => [Prediction.t()]}

  @type broadcast_message :: {:new_predictions, [Prediction.t()]}

  # Client

  @spec start_link() :: GenServer.on_start()
  @spec start_link(Keyword.t()) :: GenServer.on_start()
  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)

    GenServer.start_link(
      __MODULE__,
      opts,
      name: name
    )
  end

  @spec subscribe(Route.id_t(), Stop.id_t()) :: [Prediction.t()]
  @spec subscribe(Route.id_t(), Stop.id_t(), GenServer.server()) :: [Prediction.t()]
  def subscribe(route_id, stop_id, server \\ __MODULE__) do
    key = with_parent_stop_id(route_id, stop_id)
    StreamSupervisor.ensure_stream_is_started(key)
    {registry_key, predictions} = GenServer.call(server, {:subscribe, key})
    Registry.register(:prediction_subscriptions_registry, registry_key, key)
    predictions
  end

  # Server

  @impl GenServer
  @spec init(keyword) :: {:ok, t()}
  def init(opts) do
    subscribe_fn = Keyword.get(opts, :subscribe_fn, &Phoenix.PubSub.subscribe/2)
    subscribe_fn.(Predictions.PubSub, "predictions")
    {:ok, %__MODULE__{}}
  end

  @impl GenServer
  def handle_call(
        {:subscribe, route_and_stop_id},
        _from,
        %__MODULE__{predictions_by_key: predictions_by_key} = state
      ) do
    registry_key = self()

    predictions = predictions_for_key(predictions_by_key, route_and_stop_id)

    {:reply, {registry_key, predictions}, state}
  end

  @impl GenServer
  def handle_info(
        {:reset,
         [
           %Predictions.Prediction{route: %Routes.Route{id: route_id}, stop: %Stop{id: stop_id}}
           | _
         ] = predictions},
        %__MODULE__{predictions_by_key: predictions_by_key} = state
      ) do
    new_state = %__MODULE__{
      state
      | predictions_by_key:
          Map.put(predictions_by_key, with_parent_stop_id(route_id, stop_id), predictions)
    }

    broadcast(new_state)

    {:noreply, new_state}
  end

  def handle_info(
        {:add,
         [
           %Predictions.Prediction{
             route: %Routes.Route{id: route_id},
             stop: %Stops.Stop{id: stop_id}
           }
           | _
         ] = new_predictions},
        %__MODULE__{predictions_by_key: predictions_by_key} = state
      ) do
    new_predictions_by_key =
      Map.put(
        predictions_by_key,
        with_parent_stop_id(route_id, stop_id),
        predictions_for_key(
          predictions_by_key,
          route_id,
          stop_id
        ) ++
          new_predictions
      )

    new_state = %__MODULE__{
      state
      | predictions_by_key: new_predictions_by_key
    }

    broadcast(new_state)

    {:noreply, new_state}
  end

  def handle_info(
        {:update,
         [
           %Predictions.Prediction{
             route: %Routes.Route{id: route_id},
             stop: %Stops.Stop{id: stop_id}
           }
           | _
         ] = updated_predictions},
        %__MODULE__{predictions_by_key: predictions_by_key} = state
      ) do
    updated_prediction_ids = Enum.map(updated_predictions, & &1.id)

    predictions_sans_old =
      predictions_for_key(predictions_by_key, route_id, stop_id)
      |> Enum.reject(&Enum.member?(updated_prediction_ids, &1.id))

    new_predictions_by_key =
      Map.put(
        predictions_by_key,
        with_parent_stop_id(route_id, stop_id),
        predictions_sans_old ++ updated_predictions
      )

    new_state = %__MODULE__{
      state
      | predictions_by_key: new_predictions_by_key
    }

    broadcast(new_state)

    {:noreply, new_state}
  end

  def handle_info(
        {:remove,
         [
           %Predictions.Prediction{
             route: %Routes.Route{id: route_id},
             stop: %Stops.Stop{id: stop_id}
           }
           | _
         ] = predictions_to_remove},
        %__MODULE__{predictions_by_key: predictions_by_key} = state
      ) do
    prediction_ids_to_remove = Enum.map(predictions_to_remove, & &1.id)

    predictions_sans_removed =
      predictions_for_key(predictions_by_key, route_id, stop_id)
      |> Enum.reject(&Enum.member?(prediction_ids_to_remove, &1.id))

    new_predictions_by_key =
      Map.put(
        predictions_by_key,
        with_parent_stop_id(route_id, stop_id),
        predictions_sans_removed
      )

    new_state = %__MODULE__{
      state
      | predictions_by_key: new_predictions_by_key
    }

    broadcast(new_state)

    {:noreply, new_state}
  end

  @spec predictions_for_key(predictions_by_key(), prediction_key()) :: [Prediction.t()]
  @spec predictions_for_key(predictions_by_key(), Routes.Route.id_t(), Stops.Stop.id_t()) :: [
          Prediction.t()
        ]

  defp predictions_for_key(predictions_by_key, route_and_stop_id) do
    Map.get(predictions_by_key, with_parent_stop_id(route_and_stop_id), [])
  end

  defp predictions_for_key(predictions_by_key, route_id, stop_id) do
    Map.get(predictions_by_key, with_parent_stop_id(route_id, stop_id), [])
  end

  @spec broadcast(t()) :: :ok
  defp broadcast(state) do
    registry_key = self()

    Registry.dispatch(:prediction_subscriptions_registry, registry_key, fn entries ->
      Enum.each(entries, &send_data(&1, state))
    end)
  end

  @spec send_data({pid, prediction_key()}, t()) :: broadcast_message()
  defp send_data({pid, route_and_stop_id}, %__MODULE__{
         predictions_by_key: predictions_by_key
       }) do
    new_predictions = predictions_for_key(predictions_by_key, route_and_stop_id)
    send(pid, {:new_predictions, new_predictions})
  end

  defp with_parent_stop_id(route_and_stop_id) do
    [route_id, stop_id] = String.split(route_and_stop_id, "@")
    with_parent_stop_id(route_id, stop_id)
  end

  defp with_parent_stop_id(route_id, stop_id) do
    with %Stops.Stop{id: parent_stop_id} <- Stops.Repo.get_parent(stop_id) do
      "#{route_id}@#{parent_stop_id}"
    else
      _ ->
        "#{route_id}@#{stop_id}"
    end
  end
end
