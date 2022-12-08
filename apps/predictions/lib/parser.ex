defmodule Predictions.Parser do
  @moduledoc """
  Functions for parsing predictions from their JSON:API format.
  """

  alias JsonApi.Item
  alias Predictions.Prediction

  @type record :: {
          Prediction.id_t() | nil,
          Schedules.Trip.id_t() | nil,
          Stops.Stop.id_t(),
          Routes.Route.id_t(),
          0 | 1,
          DateTime.t() | nil,
          non_neg_integer,
          Prediction.schedule_relationship() | nil,
          String.t() | nil,
          String.t() | nil,
          boolean
        }

  @spec parse(Item.t()) :: record
  def parse(%Item{} = item) do
    {
      item.id,
      trip_id(item),
      stop_id(item),
      route_id(item),
      direction_id(item),
      first_time(item),
      stop_sequence(item),
      schedule_relationship(item),
      track(item),
      status(item),
      departing?(item)
    }
  end

  @spec departing?(Item.t()) :: boolean()
  def departing?(%Item{attributes: %{"departure_time" => binary}}) when is_binary(binary),
    do: true

  def departing?(%Item{attributes: %{"status" => binary}}) when is_binary(binary),
    do: upcoming_status?(binary)

  def departing?(_), do: false

  @spec direction_id(Item.t()) :: 0 | 1
  def direction_id(%Item{attributes: %{"direction_id" => direction_id}}), do: direction_id

  @spec first_time(Item.t()) :: DateTime.t() | nil
  def first_time(%Item{
        attributes: %{"arrival_time" => arrival_time, "departure_time" => departure_time}
      }),
      do: first_time_from_arrival_departure([arrival_time, departure_time])

  def first_time(_), do: nil

  @spec schedule_relationship(Item.t()) :: Prediction.schedule_relationship() | nil
  def schedule_relationship(%Item{attributes: %{"schedule_relationship" => "ADDED"}}), do: :added

  def schedule_relationship(%Item{attributes: %{"schedule_relationship" => "UNSCHEDULED"}}),
    do: :unscheduled

  def schedule_relationship(%Item{attributes: %{"schedule_relationship" => "CANCELLED"}}),
    do: :cancelled

  def schedule_relationship(%Item{attributes: %{"schedule_relationship" => "SKIPPED"}}),
    do: :skipped

  def schedule_relationship(%Item{attributes: %{"schedule_relationship" => "NO_DATA"}}),
    do: :no_data

  def schedule_relationship(_), do: nil

  @spec status(Item.t()) :: String.t() | nil
  def status(%Item{attributes: %{"status" => status}}), do: status
  def status(_), do: nil

  @spec stop_sequence(Item.t()) :: non_neg_integer()
  def stop_sequence(%Item{attributes: %{"stop_sequence" => stop_sequence}}), do: stop_sequence
  def stop_sequence(_), do: 0

  @spec track(Item.t()) :: String.t() | nil
  def track(%{attributes: %{"track" => track}}), do: track

  def track(%{relationships: %{"stop" => [%{attributes: %{"platform_code" => track}} | _]}}),
    do: track

  def track(_), do: nil

  defp first_time_from_arrival_departure(times) do
    case times
         |> Enum.reject(&is_nil/1)
         |> List.first()
         |> Timex.parse("{ISO:Extended}") do
      {:ok, time} -> time
      _ -> nil
    end
  end

  @spec upcoming_status?(String.t()) :: boolean
  defp upcoming_status?("Approaching"), do: true
  defp upcoming_status?("Boarding"), do: true
  defp upcoming_status?(status), do: String.ends_with?(status, "away")

  defp stop_id(%Item{relationships: %{"stop" => [%{id: id} | _]}}) do
    id
  end

  defp stop_id(%Item{relationships: %{"stop" => []}}) do
    nil
  end

  defp trip_id(%Item{relationships: %{"trip" => [%{id: id} | _]}}) do
    id
  end

  defp trip_id(%Item{relationships: %{"trip" => []}}) do
    nil
  end

  defp route_id(%Item{relationships: %{"route" => [%{id: id} | _]}}) do
    id
  end
end
