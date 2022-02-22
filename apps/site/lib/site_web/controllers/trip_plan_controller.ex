defmodule SiteWeb.TripPlanController do
  @moduledoc """
  Controller for trip plans.
  """

  use SiteWeb, :controller
  alias Fares.{Fare, Month, OneWay}
  alias GoogleMaps.Geocode
  alias Routes.Route
  alias Site.TripPlan.{Query, RelatedLink, ItineraryRow, ItineraryRowList}
  alias Site.TripPlan.Map, as: TripPlanMap
  alias TripPlan.{Itinerary, Leg, NamedPosition, PersonalDetail, TransitDetail, Transfer}

  plug(:require_location_service)
  plug(:assign_initial_map)
  plug(:breadcrumbs)
  plug(:modes)
  plug(:optimize_for)
  plug(:meta_description)
  plug(:assign_datetime_selector_fields)

  @type route_map :: %{optional(Route.id_t()) => Route.t()}
  @type route_mapper :: (Route.id_t() -> Route.t() | nil)

  @options %{
    geocode_fn: &LocationService.Geocode.geocode/1,
    reverse_geocode_fn: &LocationService.ReverseGeocode.reverse_geocode/2
  }

  @plan_datetime_selector_fields %{
    depart: "depart",
    leaveNow: "leave-now",
    arrive: "arrive",
    controls: "trip-plan-datepicker",
    year: "plan_date_time_year",
    month: "plan_date_time_month",
    day: "plan_date_time_day",
    hour: "plan_date_time_hour",
    minute: "plan_date_time_minute",
    amPm: "plan_date_time_am_pm",
    dateEl: %{
      container: "plan-date",
      input: "plan-date-input",
      select: "plan-date-select",
      label: "plan-date-label"
    },
    timeEl: %{
      container: "plan-time",
      select: "plan-time-select",
      label: "plan-time-label"
    },
    title: "trip-plan-departure-title"
  }

  def index(conn, %{"plan" => %{"to" => _to, "from" => _fr} = plan}) do
    conn
    |> assign(:expanded, conn.query_params["expanded"])
    |> render_plan(plan)
  end

  def index(conn, _params) do
    render(conn, :index)
  end

  def to(conn, %{"plan" => _plan} = params) do
    redirect(conn, to: trip_plan_path(conn, :index, Map.delete(params, "address")))
  end

  def to(conn, %{
        "address" => <<latitude::bytes-size(9)>> <> "," <> <<longitude::bytes-size(10)>> = address
      }) do
    destination = %TripPlan.NamedPosition{
      latitude: latitude,
      longitude: longitude,
      name: address,
      stop_id: nil
    }

    do_to(conn, destination)
  end

  def to(conn, %{"address" => address}) do
    updated_address = Geocode.check_address(address, @options)

    case TripPlan.geocode(updated_address) do
      {:ok, geocoded_to} ->
        do_to(conn, geocoded_to)

      {:error, _} ->
        # redirect to the initial index page
        redirect(conn, to: trip_plan_path(conn, :index))
    end
  end

  defp do_to(conn, destination) do
    # build a default query with a pre-filled 'to' field:
    query = %Query{
      to: destination,
      time: {:error, :unknown},
      from: {:error, :unknown}
    }

    now = Util.now()

    # build map information for a single leg with the 'to' field:
    {map_data, map_src} =
      TripPlanMap.itinerary_map([
        %Leg{
          from: nil,
          to: destination,
          mode: %PersonalDetail{},
          description: "",
          start: now,
          stop: now,
          name: "",
          long_name: "",
          type: "",
          url: "",
          polyline: ""
        }
      ])

    %{markers: [marker]} = map_data
    to_marker = %{marker | id: "B"}
    map_info_for_to_destination = {%{map_data | markers: [to_marker]}, map_src}

    conn
    |> assign(:query, query)
    |> assign(:map_info, map_info_for_to_destination)
    |> render(:index)
  end

  defp get_route(link) do
    if is_bitstring(link.text) do
      link.text
    else
      link.text |> List.to_string()
    end
  end

  defp filter_duplicate_links(related_links) do
    Enum.map(related_links, fn x -> Enum.uniq_by(x, fn y -> get_route(y) end) end)
  end

  @spec render_plan(Plug.Conn.t(), map) :: Plug.Conn.t()
  defp render_plan(conn, plan) do
    query =
      Query.from_query(
        plan,
        now: conn.assigns.date_time,
        end_of_rating: Map.get(conn.assigns, :end_of_rating, Schedules.Repo.end_of_rating())
      )

    itineraries =
      query
      |> Query.get_itineraries()
      |> with_fares_and_passes()
      |> with_free_legs_if_from_airport()

    route_map = routes_for_query(itineraries)
    route_mapper = &Map.get(route_map, &1)
    itinerary_row_lists = itinerary_row_lists(itineraries, route_mapper, plan)

    conn
    |> render(
      query: query,
      itineraries: itineraries,
      plan_error: MapSet.to_list(query.errors),
      routes: Enum.map(itineraries, &routes_for_itinerary(&1, route_mapper)),
      itinerary_maps:
        Enum.map(itineraries, &TripPlanMap.itinerary_map(&1, route_mapper: route_mapper)),
      related_links:
        filter_duplicate_links(
          Enum.map(itineraries, &RelatedLink.links_for_itinerary(&1, route_by_id: route_mapper))
        ),
      itinerary_row_lists: itinerary_row_lists
    )
  end

  def require_location_service(conn, _) do
    assign(conn, :requires_location_service?, true)
  end

  @spec assign_datetime_selector_fields(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  defp assign_datetime_selector_fields(conn, _) do
    conn
    |> assign(:plan_datetime_selector_fields, @plan_datetime_selector_fields)
  end

  @spec with_fares_and_passes([Itinerary.t()]) :: [Itinerary.t()]
  defp with_fares_and_passes(itineraries) do
    Enum.map(itineraries, fn itinerary ->
      legs_with_fares = itinerary.legs |> Enum.map(&leg_with_fares/1)

      base_month_pass = base_month_pass_for_itinerary(itinerary)

      passes = %{
        base_month_pass: base_month_pass,
        recommended_month_pass: recommended_month_pass_for_itinerary(itinerary),
        reduced_month_pass: reduced_month_pass_for_itinerary(itinerary, base_month_pass)
      }

      %{itinerary | legs: legs_with_fares, passes: passes}
    end)
  end

  @spec leg_with_fares(Leg.t()) :: Leg.t()
  defp leg_with_fares(%Leg{mode: %PersonalDetail{}} = leg) do
    leg
  end

  defp leg_with_fares(%Leg{mode: %TransitDetail{}} = leg) do
    route = Routes.Repo.get(leg.mode.route_id)
    trip = Schedules.Repo.trip(leg.mode.trip_id)
    origin_id = leg.from.stop_id
    destination_id = leg.to.stop_id

    fares =
      if Leg.is_fare_complete_transit_leg?(leg) do
        recommended_fare = OneWay.recommended_fare(route, trip, origin_id, destination_id)
        base_fare = OneWay.base_fare(route, trip, origin_id, destination_id)
        reduced_fare = OneWay.reduced_fare(route, trip, origin_id, destination_id)

        %{
          highest_one_way_fare: base_fare,
          lowest_one_way_fare: recommended_fare,
          reduced_one_way_fare: reduced_fare
        }
      else
        %{
          highest_one_way_fare: nil,
          lowest_one_way_fare: nil,
          reduced_one_way_fare: nil
        }
      end

    mode_with_fares = %TransitDetail{leg.mode | fares: fares}
    %{leg | mode: mode_with_fares}
  end

  @spec base_month_pass_for_itinerary(Itinerary.t()) :: Fare.t() | nil
  defp base_month_pass_for_itinerary(%Itinerary{legs: legs}) do
    legs
    |> Enum.map(&highest_month_pass/1)
    |> max_by_cents()
  end

  @spec recommended_month_pass_for_itinerary(Itinerary.t()) :: Fare.t() | nil
  defp recommended_month_pass_for_itinerary(%Itinerary{legs: legs}) do
    legs
    |> Enum.map(&lowest_month_pass/1)
    |> max_by_cents()
  end

  @spec reduced_month_pass_for_itinerary(Itinerary.t(), Fare.t() | nil) :: Fare.t() | nil
  defp reduced_month_pass_for_itinerary(%Itinerary{legs: legs}, base_month_pass) do
    reduced_pass =
      legs
      |> Enum.map(&reduced_pass/1)
      |> max_by_cents()

    if Fare.valid_modes(base_month_pass) -- Fare.valid_modes(reduced_pass) == [] do
      reduced_pass
    else
      nil
    end
  end

  @spec highest_month_pass(Leg.t()) :: Fare.t() | nil
  defp highest_month_pass(%Leg{mode: %PersonalDetail{}}), do: nil

  defp highest_month_pass(
         %Leg{
           mode: %TransitDetail{route_id: route_id, trip_id: trip_id},
           from: %NamedPosition{stop_id: origin_id},
           to: %NamedPosition{stop_id: destination_id}
         } = leg
       ) do
    if Leg.is_fare_complete_transit_leg?(leg) do
      Month.base_pass(route_id, trip_id, origin_id, destination_id)
    else
      nil
    end
  end

  @spec lowest_month_pass(Leg.t()) :: Fare.t() | nil
  defp lowest_month_pass(%Leg{mode: %PersonalDetail{}}), do: nil

  defp lowest_month_pass(
         %Leg{
           mode: %TransitDetail{route_id: route_id, trip_id: trip_id},
           from: %NamedPosition{stop_id: origin_id},
           to: %NamedPosition{stop_id: destination_id}
         } = leg
       ) do
    if Leg.is_fare_complete_transit_leg?(leg) do
      Month.recommended_pass(route_id, trip_id, origin_id, destination_id)
    else
      nil
    end
  end

  @spec reduced_pass(Leg.t()) :: Fare.t() | nil
  defp reduced_pass(%Leg{mode: %PersonalDetail{}}), do: nil

  defp reduced_pass(
         %Leg{
           mode: %TransitDetail{route_id: route_id, trip_id: trip_id},
           from: %NamedPosition{stop_id: origin_id},
           to: %NamedPosition{stop_id: destination_id}
         } = leg
       ) do
    if Leg.is_fare_complete_transit_leg?(leg) do
      Month.reduced_pass(route_id, trip_id, origin_id, destination_id)
    else
      nil
    end
  end

  @spec max_by_cents([Fare.t() | nil]) :: Fare.t() | nil
  defp max_by_cents(fares), do: Enum.max_by(fares, &cents_for_max/1, fn -> nil end)

  @spec cents_for_max(Fare.t() | nil) :: non_neg_integer
  defp cents_for_max(nil), do: 0
  defp cents_for_max(%Fare{cents: cents}), do: cents

  @spec itinerary_row_lists([Itinerary.t()], route_mapper, map) :: [ItineraryRowList.t()]
  defp itinerary_row_lists(itineraries, route_mapper, plan) do
    deps = %ItineraryRow.Dependencies{route_mapper: route_mapper}
    Enum.map(itineraries, &ItineraryRowList.from_itinerary(&1, deps, to_and_from(plan)))
  end

  @spec assign_initial_map(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def assign_initial_map(conn, _opts) do
    conn
    |> assign(:map_info, {TripPlanMap.initial_map_data(), TripPlanMap.initial_map_src()})
  end

  @spec modes(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def modes(%Plug.Conn{params: %{"plan" => %{"modes" => modes}}} = conn, _) do
    assign(
      conn,
      :modes,
      Map.new(modes, fn {mode, active?} -> {String.to_existing_atom(mode), active? === "true"} end)
    )
  end

  def modes(%Plug.Conn{} = conn, _) do
    assign(conn, :modes, %{})
  end

  @spec breadcrumbs(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  defp breadcrumbs(conn, _) do
    assign(conn, :breadcrumbs, [Breadcrumb.build("Trip Planner")])
  end

  @spec optimize_for(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def optimize_for(%Plug.Conn{params: %{"plan" => %{"optimize_for" => val}}} = conn, _) do
    assign(conn, :optimize_for, val)
  end

  def optimize_for(%Plug.Conn{} = conn, _) do
    assign(conn, :optimize_for, "best_route")
  end

  @spec routes_for_query([Itinerary.t()]) :: route_map
  def routes_for_query(itineraries) do
    itineraries
    |> Enum.flat_map(&Itinerary.route_ids/1)
    |> add_additional_routes()
    |> Enum.uniq()
    |> Map.new(&{&1, get_route(&1, itineraries)})
  end

  @spec routes_for_itinerary(Itinerary.t(), route_mapper) :: [Route.t()]
  defp routes_for_itinerary(itinerary, route_mapper) do
    itinerary
    |> Itinerary.route_ids()
    |> Enum.map(route_mapper)
  end

  @spec to_and_from(map) :: [to: String.t() | nil, from: String.t() | nil]
  def to_and_from(plan) do
    [to: Map.get(plan, "to"), from: Map.get(plan, "from")]
  end

  defp add_additional_routes(ids) do
    if Enum.any?(ids, &String.starts_with?(&1, "Green")) do
      # no cover
      Enum.concat(ids, GreenLine.branch_ids())
    else
      ids
    end
  end

  defp get_route(id, itineraries) do
    case Routes.Repo.get(id) do
      %Route{} = route -> route
      nil -> get_route_from_itinerary(itineraries, id)
    end
  end

  @spec get_route_from_itinerary([Itinerary.t()], Route.id_t()) :: Route.t()
  defp get_route_from_itinerary(itineraries, id) do
    # used for non-MBTA routes that are returned by
    # OpenTripPlanner but do not exist in our repo,
    # such as Logan Express.

    %Itinerary{legs: legs} =
      Enum.find(itineraries, &(&1 |> Itinerary.route_ids() |> Enum.member?(id)))

    %Leg{
      description: description,
      mode: mode,
      long_name: long_name,
      name: name,
      type: type,
      url: url
    } = Enum.find(legs, &(Leg.route_id(&1) == {:ok, id}))

    custom_route = %Route{
      description: description,
      id: mode.route_id,
      long_name: long_name,
      name: name,
      type: type,
      custom_route?: true,
      color: "000000"
    }

    case {url, description} do
      # Workaround for Massport buses, manually assign type
      {"https://massport.com/", "BUS"} ->
        %Route{
          custom_route
          | type: "Massport-" <> type
        }

      _ ->
        custom_route
    end
  end

  defp meta_description(conn, _) do
    conn
    |> assign(
      :meta_description,
      "Plan a trip on public transit in the Greater Boston region with directions " <>
        "and suggestions based on real-time data."
    )
  end

  @spec with_free_legs_if_from_airport([Itinerary.t()]) :: [Itinerary.t()]
  defp with_free_legs_if_from_airport(itineraries) do
    Enum.map(itineraries, fn itinerary ->
      # If Logan airport is the origin, all subsequent subway trips from there should be free
      first_transit_leg = itinerary |> Itinerary.transit_legs() |> List.first()

      if Leg.stop_is_silver_line_airport?([first_transit_leg], :from) do
        readjust_itinerary_with_free_fares(itinerary)
      else
        itinerary
      end
    end)
  end

  @spec readjust_itinerary_with_free_fares(Itinerary.t()) :: Itinerary.t()
  def readjust_itinerary_with_free_fares(itinerary) do
    transit_legs =
      itinerary.legs
      |> Enum.with_index()
      |> Enum.filter(fn {leg, _idx} -> Leg.transit?(leg) end)

    # set the subsequent subway legs' highest_fare to nil so they get ignored by the fare calculations afterwards:
    legs_after_airport = List.delete_at(transit_legs, 0)

    free_subway_legs =
      if Enum.empty?(legs_after_airport) do
        []
      else
        Enum.chunk_by(
          legs_after_airport,
          fn {leg, _idx} ->
            highest_fare =
              leg
              |> Fares.get_fare_by_type(:highest_one_way_fare)

            if is_nil(highest_fare) do
              false
            else
              Transfer.is_subway?(highest_fare.mode)
            end
          end
        )
        |> Enum.at(0)
      end

    free_subway_indexes =
      if Enum.empty?(free_subway_legs) do
        []
      else
        free_subway_legs
        |> Enum.map(fn {_leg, index} ->
          index
        end)
      end

    readjusted_legs =
      itinerary.legs
      |> Enum.with_index()
      |> Enum.map(fn {leg, index} ->
        if index in free_subway_indexes do
          %{
            leg
            | mode: %{
                leg.mode
                | fares: %{
                    highest_one_way_fare: nil
                  }
              }
          }
        else
          leg
        end
      end)

    %{itinerary | legs: readjusted_legs}
  end
end
