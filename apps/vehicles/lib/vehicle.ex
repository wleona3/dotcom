defmodule Vehicles.Vehicle do
  @moduledoc false
  defstruct [
    :id,
    :route_id,
    :trip_id,
    :shape_id,
    :stop_id,
    :direction_id,
    :longitude,
    :latitude,
    :status,
    :bearing,
    :crowding
  ]

  @type status :: :in_transit | :stopped | :incoming
  @type crowding :: :not_crowded | :some_crowding | :crowded

  @type t :: %__MODULE__{
          id: String.t(),
          route_id: String.t() | nil,
          trip_id: String.t() | nil,
          shape_id: String.t() | nil,
          stop_id: String.t() | nil,
          direction_id: 0 | 1,
          longitude: float,
          latitude: float,
          bearing: non_neg_integer,
          status: status,
          crowding: crowding | nil
        }

  def prediction(%__MODULE__{
        route_id: route_id,
        trip_id: trip_id,
        stop_id: stop_id,
        direction_id: direction_id
      }) do
    Predictions.Repo.all(
      route: route_id,
      stop: stop_id,
      trip: trip_id,
      direction_id: direction_id
    )
    |> List.first()
  end

  def trip(%__MODULE__{trip_id: trip_id}), do: Schedules.Repo.trip(trip_id)

  def route(%__MODULE__{route_id: route_id}), do: Routes.Repo.get(route_id)
end
