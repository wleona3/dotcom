defmodule Site.MapHelpers.Markers do
  alias GoogleMaps.MapData.{Marker, Symbol}
  alias Vehicles.Vehicle
  alias Routes.Route
  alias Stops.Stop

  @z_index %{
    vehicle: 1_000
  }

  @doc """
  Builds marker data for a stop that will be displayed in a Google Map.
  """
  @spec stop(Stop.t(), boolean) :: Marker.t()
  def stop(%Stop{} = stop, is_terminus?) when is_boolean(is_terminus?) do
    Marker.new(
      stop.latitude,
      stop.longitude,
      id: "stop-" <> stop.id,
      icon: Site.MapHelpers.map_stop_icon_path(:tiny, is_terminus?),
      tooltip: stop.name,
      size: :tiny
    )
  end
end
