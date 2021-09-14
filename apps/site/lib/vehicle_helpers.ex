defmodule VehicleHelpers do
  @moduledoc """
  Various functions for working on lists of vehicle to show on a map, or render tooltips.
  """
  alias Vehicles.Vehicle
  alias Predictions.Prediction
  alias Routes.{Route, Shape}
  alias Stops.Stop
  alias Schedules.Trip
  alias SiteWeb.ScheduleController.VehicleLocations

  import Routes.Route, only: [vehicle_name: 1]
  import Phoenix.HTML.Tag, only: [content_tag: 2]
  import Phoenix.HTML, only: [safe_to_string: 1]

  require Logger

  @type tooltip_index_key :: {Trip.id_t() | nil, Stop.id_t()} | Stop.id_t()
  @type tooltip_index :: %{
          optional({Trip.id_t() | nil, Stop.id_t()}) => VehicleTooltip.t(),
          optional(Stop.id_t()) => VehicleTooltip.t()
        }

  @doc """
  There are multiple places where vehicle tooltips are used. This function is called from the controller to
  construct a convenient map that can be used in views / templates to determine if a tooltip is available
  and to fetch all of the required data
  """
  @spec build_tooltip_index(Route.t(), VehicleLocations.t()) :: tooltip_index
  def build_tooltip_index(route, vehicle_locations) do
    vehicle_locations
    |> Stream.reject(fn {{_trip_id, stop_id}, _status} -> is_nil(stop_id) end)
    |> Enum.reduce(%{}, fn vehicle_location, output ->
      {{trip_id, child_stop_id}, vehicle_status} = vehicle_location

      parent_stop = Stops.Repo.get_parent(child_stop_id)
      stop_id = stop_id(parent_stop, child_stop_id)

      tooltip = %VehicleTooltip{
        vehicle: vehicle_status,
        prediction: Vehicles.Vehicle.prediction(vehicle_status),
        stop_name: stop_name(parent_stop),
        trip: Vehicles.Vehicle.trip(vehicle_status),
        route: route
      }

      output
      |> Map.put(stop_id, tooltip)
      |> Map.put({trip_id, stop_id}, tooltip)
    end)
  end

  @spec stop_name(Stops.Stop.t() | nil) :: String.t()
  defp stop_name(nil), do: ""
  defp stop_name(stop), do: stop.name

  @spec stop_id(Stops.Stop.t() | nil, String.t()) :: String.t()
  defp stop_id(nil, child_stop_id), do: child_stop_id
  defp stop_id(stop, _), do: stop.id

  @doc """
  Get polylines for vehicles that didn't already have their shape included when the route polylines were requested
  """
  @spec get_vehicle_polylines(VehicleLocations.t(), [Shape.t()]) :: [String.t()]
  def get_vehicle_polylines(locations, route_shapes) do
    vehicle_shape_ids = vehicle_shape_ids(locations)
    route_shape_ids = MapSet.new(route_shapes, & &1.id)

    vehicle_shape_ids
    |> MapSet.difference(route_shape_ids)
    |> Enum.map(&Routes.Repo.get_shape(&1))
    |> Enum.flat_map(fn
      [] ->
        []

      [%Shape{} = shape | _] ->
        [shape.polyline]
    end)
  end

  @spec vehicle_shape_ids(VehicleLocations.t()) :: MapSet.t()
  defp vehicle_shape_ids(locations) do
    for {_, value} <- locations,
        is_binary(value.shape_id),
        into: MapSet.new() do
      value.shape_id
    end
  end

  @doc """
  Function used to return tooltip text for a VehicleTooltip struct
  """
  @spec tooltip(VehicleTooltip.t() | nil) :: Phoenix.HTML.Safe.t()
  def tooltip(nil) do
    ""
  end

  def tooltip(%{
        prediction: prediction,
        vehicle: vehicle,
        trip: trip,
        stop_name: stop_name,
        route: route
      }) do
    # Get stop name from vehicle if present, otherwise use provided predicted stop_name
    stop_name =
      if vehicle.stop_id do
        case Stops.Repo.get_parent(vehicle.stop_id) do
          nil -> stop_name
          %Stops.Stop{name: name} -> name
        end
      else
        stop_name
      end
    trip_text = headsign_trip_text(trip, stop_name, vehicle, route)
    status_text = vehicle_status_with_stop(prediction, vehicle, stop_name)
    track_text = status_text(route, prediction)

    sign = trip_text ++ status_text ++ track_text
    sign
    |> maybe_log_strange_status(vehicle, prediction, trip)
    |> build_tooltip()
  end

  @spec status_text(Route.t(), Prediction.t() | nil) :: iodata
  defp status_text(%Route{type: 2}, %Prediction{status: "Departed"}) do
    []
  end

  defp status_text(%Route{type: 2}, %Prediction{status: status, track: track})
       when not is_nil(track) and not is_nil(status) do
    [", #{String.downcase(status)} on track ", track]
  end

  defp status_text(%Route{type: 2}, %Prediction{track: track})
       when not is_nil(track) do
    [" on track ", track]
  end

  defp status_text(_, _) do
    []
  end

  @spec headsign_trip_text(Trip.t() | nil, String.t(), Vehicle.t() | nil, Route.t()) :: iodata
  defp headsign_trip_text(trip, _stop_name, _vehicle, route) do
    [
      display_headsign_text(route, trip),
      String.downcase(vehicle_name(route)),
      display_trip_name(route, trip)
    ]
  end

  @spec display_headsign_text(Route.t(), Trip.t() | nil) :: iodata
  defp display_headsign_text(_, %{headsign: headsign}), do: [headsign, " "]
  defp display_headsign_text(%{name: name}, _), do: [name, " "]
  defp display_headsign_text(_, _), do: ""

  @spec vehicle_status_with_stop(Prediction.t() | nil, Vehicle.t(), String.t()) :: iodata()
  defp vehicle_status_with_stop(_prediction, _vehicles, "") do
    []
  end

  defp vehicle_status_with_stop(%Prediction{status: "Departed"}, _vehicle, stop_name) do
    [" has left ", stop_name]
  end

  defp vehicle_status_with_stop(_prediction, %Vehicle{status: status}, stop_name) do
    [
      realtime_status_text(status),
      stop_name
    ]
  end

  @spec realtime_status_text(atom) :: String.t()
  defp realtime_status_text(:incoming), do: " is arriving at "
  defp realtime_status_text(:stopped), do: " has arrived at "
  defp realtime_status_text(:in_transit), do: " is on the way to "

  @spec display_trip_name(Route.t(), Trip.t() | nil) :: iodata
  defp display_trip_name(%{type: 2}, %{name: name}), do: [" ", name]
  defp display_trip_name(_, _), do: ""

  @spec build_tooltip(iodata) :: String.t()
  defp build_tooltip(text) do
    :div
    |> content_tag(text)
    |> safe_to_string
    |> String.replace(~s("), ~s('))
  end

  # Log for further investigation later
  # "South Station train 872 is on the way to Back Bay, all aboard on track 2"
  def maybe_log_strange_status(text, vehicle, prediction, trip) do
    string = Enum.join(text)

    [
      &all_aboard_but_not/1,
      &departed_but_confusing/1
    ]
    |> Enum.each(fn condition ->
      if condition.(string) do
        Logger.info("module=#{__MODULE__} tooltip_status text=\"#{string}\" vehicle=#{vehicle.id} trip=#{trip.id} prediction=#{if prediction, do: prediction.id, else: ""}")
      end
    end)

    text
  end

  defp departed_but_confusing(string) do
    has_phrases(string, ["on the way to", "has left"]) or has_phrases(string, ["is arriving", "has left"]) or
    has_phrases(string, ["arrived at", "has left"]) or has_phrases(string, ["on track", "has left"])
  end

  defp all_aboard_but_not(string) do
    has_phrases(string, ["on the way to", "all aboard"]) or has_phrases(string, ["is arriving", "all aboard"])
  end

  defp has_phrases(string, phrase_list) do
    Enum.all?(phrase_list, &String.contains?(string, &1))
  end
end
