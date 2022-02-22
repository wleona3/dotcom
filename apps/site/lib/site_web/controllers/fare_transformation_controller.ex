defmodule SiteWeb.FareTransformationController do
  @moduledoc """
  Controller for the Fare Transformation section of the website.
  """
  use SiteWeb, :controller
  alias Fares.ProposedLocations
  alias GoogleMaps.Geocode
  import SiteWeb.ViewHelpers, only: [cms_static_page_path: 2]

  @options %{
    geocode_fn: &LocationService.Geocode.geocode/1,
    reverse_geocode_fn: &LocationService.ReverseGeocode.reverse_geocode/2
  }

  def index(conn, %{"id" => "proposed-sales-locations"} = params) do
    finder(conn, params)
  end

  def index(conn, _params) do
    redirect(conn,
      to: SiteWeb.Router.Helpers.fare_path(conn, :show, "retail-sales-locations")
    )
  end

  def finder(conn, %{"location" => %{"address" => address}} = params) do
    address = Geocode.check_address(address, @options)
    params = %{params | "location" => %{"address" => address}}

    {position, _formatted} = Geocode.calculate_position(params, @options.geocode_fn)

    nearby_proposed_locations = ProposedLocations.by_lat_lon(position)

    nearby_proposed_locations_with_distance =
      if is_nil(nearby_proposed_locations) do
        []
      else
        # Return the 10 closest locations, sorted by distance
        nearby_proposed_locations
        |> Util.Distance.sort(position)
        # There are 1178 PSLs. Since we are rendering them as hidden and showing/hiding them based on the filter,
        # we should really narrow down how many we are passing
        |> Enum.slice(0, 50)
        |> Enum.map(fn loc ->
          lat_lon = {loc.latitude, loc.longitude}
          {loc, Util.Distance.haversine(lat_lon, position)}
        end)
      end

    render_page(conn, nearby_proposed_locations_with_distance, address, position)
  end

  def finder(conn, %{"latitude" => lat, "longitude" => lon} = params) do
    params = Map.put(params, "location", %{"address" => lat <> "," <> lon})

    finder(conn, params)
  end

  def finder(conn, _params) do
    render_page(conn, nil, "", %{})
  end

  def render_page(conn, nearby_proposed_locations, address, search_position) do
    conn
    |> assign(:breadcrumbs, [
      Breadcrumb.build(
        "Fare Transformation",
        cms_static_page_path(conn, "/fare-transformation")
      ),
      Breadcrumb.build("Proposed Sales Locations")
    ])
    |> render(
      "proposed_sales_locations.html",
      requires_location_service?: true,
      nearby_proposed_locations: nearby_proposed_locations,
      address: address,
      search_position: search_position
    )
  end
end
