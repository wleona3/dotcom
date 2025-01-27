defmodule SiteWeb.RouteController do
  @moduledoc """
  Endpoints for getting route data.
  """
  use SiteWeb, :controller
  alias RoutePatterns.RoutePattern
  alias Routes.{Repo, Route}

  def get_by_stop_id(conn, %{"stop_id" => stop_id} = _params) do
    routesWithPolylines =
      stop_id
      |> Repo.by_stop()
      |> Enum.map(fn route ->
        route
        |> Route.to_json_safe()
        |> Map.put(:polylines, route_polylines(route, stop_id))
      end)

    json(conn, routesWithPolylines)
  end

  defp route_polylines(route, stop_id) do
    if Route.rail?(route) or Route.silver_line?(route) do
      route.id
      |> RoutePatterns.Repo.by_route_id(stop: stop_id)
      |> Enum.map(fn %RoutePattern{shape_id: id, representative_trip_polyline: polyline} ->
        positions =
          polyline
          |> Polyline.decode()
          |> Enum.map(fn {lng, lat} -> [lat, lng] end)

        %Leaflet.MapData.Polyline{
          id: id,
          color: "#" <> route.color,
          dotted?: false,
          positions: positions,
          weight: 4
        }
      end)
    else
      []
    end
  end
end
