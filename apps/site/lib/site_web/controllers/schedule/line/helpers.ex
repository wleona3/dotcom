defmodule SiteWeb.ScheduleController.Line.Helpers do
  @moduledoc """
  Helpers for the line page
  """

  alias RoutePatterns.Repo, as: RoutePatternsRepo
  alias RoutePatterns.RoutePattern
  alias Routes.Repo, as: RoutesRepo
  alias Routes.{Route, Shape}
  alias Stops.Repo, as: StopsRepo
  alias Stops.{RouteStop, RouteStops, Stop}

  @type query_param :: String.t() | nil
  @type direction_id :: 0 | 1
  @typep stops_by_route :: %{String.t() => [Stop.t()]}

  @spec get_route(String.t()) :: {:ok, Route.t()} | :not_found
  def get_route(""), do: :not_found

  def get_route(route_id) do
    route = do_get_route(route_id)

    if route != nil do
      {:ok, route}
    else
      :not_found
    end
  end

  @spec do_get_route(String.t()) :: Route.t() | nil
  defp do_get_route("Green") do
    RoutesRepo.green_line()
  end

  defp do_get_route(route_id) do
    RoutesRepo.get(route_id)
  end

  @doc """
  Gets a list of RouteStops representing all of the branches on the route. Routes without branches will always be a
  list with a single RouteStops struct.
  """
  @spec get_branch_route_stops(Route.t(), direction_id()) :: [RouteStops.t()]
  @spec get_branch_route_stops(Route.t(), direction_id(), RoutePattern.id_t() | nil) :: [
          RouteStops.t()
        ]
  def get_branch_route_stops(route, direction_id, route_pattern_id \\ nil)

  def get_branch_route_stops(%Route{id: "Green"}, direction_id, route_pattern_id) do
    GreenLine.branch_ids()
    |> Enum.reduce([], fn route_id, acc ->
      case get_route(route_id) do
        {:ok, route} ->
          [route | acc]

        :not_found ->
          acc
      end
    end)
    |> Enum.map(fn route ->
      route
      |> do_get_branch_route_stops(direction_id, route_pattern_id)
      |> RouteStop.list_from_route_patterns(route, direction_id, true)
    end)
    |> nil_out_shared_stop_branches()
    |> RouteStops.from_route_stop_groups()
  end

  def get_branch_route_stops(route, direction_id, route_pattern_id) do
    route
    |> do_get_branch_route_stops(direction_id, route_pattern_id)
    |> Enum.map(&RouteStop.list_from_route_pattern(&1, route, direction_id))
    |> make_trunks_consistent(route)
    # |> other_line_modifications(route)
    |> RouteStops.from_route_stop_groups()
  end

  @spec do_get_branch_route_stops(Route.t(), direction_id(), RoutePattern.id_t() | nil) :: [
          {RoutePattern.t(), [Stop.t()]}
        ]
  defp do_get_branch_route_stops(route, direction_id, route_pattern_id) do
    route_patterns = get_line_route_patterns(route.id, direction_id, route_pattern_id)

    route_patterns
    |> filtered_by_typicality()
    |> Enum.map(&stops_for_route_pattern/1)
    |> maybe_use_overarching_branch()
  end

  # @spec other_line_modifications([[RouteStop.t()]], Route.t()) :: [[RouteStop.t()]]
  # defp other_line_modifications(route_stop_lists, %Route{id: "CR-Providence"}) do
  #   Enum.map(route_stop_lists, fn route_stops ->
  #     # Pawtucket Falls not in service yet! Remove this soon!
  #     Enum.reject(route_stops, &(&1.id == "place-NEC-1891"))
  #   end)
  # end

  # defp other_line_modifications(route_stop_lists, _), do: route_stop_lists

  @routes_with_trunk_discrepancies ~w(CR-Franklin CR-Providence)
  @spec make_trunks_consistent([[RouteStop.t()]], Route.t()) :: [[RouteStop.t()]]
  defp make_trunks_consistent(route_stop_lists, %Route{id: route_id})
       when route_id in @routes_with_trunk_discrepancies do
    shared_ids = shared_ids(route_stop_lists)

    route_stop_lists_with_trunk_ranges =
      Enum.map(route_stop_lists, fn route_stop_list ->
        trunk_range =
          range(route_stop_list, fn route_stop -> MapSet.member?(shared_ids, route_stop.id) end)

        {route_stop_list, trunk_range}
      end)

    largest_trunk = largest_trunk(route_stop_lists_with_trunk_ranges)

    Enum.map(route_stop_lists_with_trunk_ranges, fn {route_stops, trunk_range} ->
      old_trunk = Enum.slice(route_stops, trunk_range)

      if old_trunk == largest_trunk do
        # No need to replace anything
        route_stops
      else
        route_stops
        |> Enum.reject(&Enum.member?(old_trunk, &1))
        |> List.insert_at(trunk_range.first, largest_trunk)
        |> List.flatten()
      end
    end)
  end

  defp make_trunks_consistent(route_stop_lists, _route), do: route_stop_lists

  @spec range(Enum.t(), (Enum.element() -> as_boolean(term()))) :: Range.t()
  defp range(items, fun) do
    {min, max} =
      items
      |> Enum.with_index()
      |> Enum.reduce([], fn {item, index}, acc -> if fun.(item), do: [index | acc], else: acc end)
      |> Enum.min_max()

    min..max
  end

  @spec largest_trunk([{[RouteStop.t()], Range.t()}]) :: [RouteStop.t()]
  defp largest_trunk(route_stop_lists_with_trunk_ranges) do
    largest_trunk_range =
      route_stop_lists_with_trunk_ranges
      |> Enum.map(&elem(&1, 1))
      |> Enum.max()

    route_stop_lists_with_trunk_ranges
    |> Enum.find(fn {_, trunk_range} -> trunk_range == largest_trunk_range end)
    |> elem(0)
    |> Enum.slice(largest_trunk_range)
  end

  @spec get_map_route_patterns(Route.id_t(), Route.type_int()) :: [RoutePattern.t()]
  def get_map_route_patterns("Green", type) do
    GreenLine.branch_ids() |> Enum.join(",") |> get_map_route_patterns(type)
  end

  def get_map_route_patterns(route_id, type) do
    route_id
    |> RoutePatternsRepo.by_route_id()
    |> filter_map_route_patterns(type)
  end

  @spec filter_map_route_patterns([RoutePattern.t()], Route.type_int()) :: [RoutePattern.t()]
  # For bus, return all patterns
  defp filter_map_route_patterns(route_patterns, 3), do: route_patterns
  # For other rail, we only need the primary route_pattern and branches for each direction
  # Filtering here helps lighten the frontend load, hopefully reducing latency
  defp filter_map_route_patterns(route_patterns, _type) do
    for direction <- 0..1, into: [] do
      route_patterns
      |> Enum.filter(fn pattern -> pattern.direction_id == direction end)
      |> filter_by_min_typicality()
    end
    |> List.flatten()
  end

  # Before constructing branches, detect whether one of the lists of stops is a
  # superset of the other lists of stops. In that case we can just proceed with
  # the superset stop list for display on the line diagram.
  @spec maybe_use_overarching_branch([
          {RoutePattern.t(), [Stop.t()]}
        ]) :: [
          {RoutePattern.t(), [Stop.t()]}
        ]
  defp maybe_use_overarching_branch(branches) do
    case overarching_branch(branches) do
      nil ->
        branches

      overarching_branch ->
        [overarching_branch]
    end
  end

  # Is there a route pattern whose stops cover all stops on all the given route
  # patterns? If so, return it.
  # For example, this happens on CR-Kingston, where one route pattern terminates
  # at Kingston and another goes one stop further to Plymouth. In that case we
  # want to display the route pattern to Plymouth as it emcompasses more stops
  @spec overarching_branch([
          {RoutePattern.t(), [Stop.t()]}
        ]) :: {RoutePattern.t(), [Stop.t()]} | nil
  defp overarching_branch(route_patterns_with_stops) do
    all_stop_sets =
      route_patterns_with_stops
      |> Enum.map(fn {route_pattern, stops} ->
        stops
        |> maybe_adjust_for_rail_replacement_bus(route_pattern)
      end)
      |> Enum.map(&MapSet.new/1)

    route_patterns_with_stops
    |> Enum.find(&has_all_stops?(&1, all_stop_sets))
  end

  # If these stops are for a rail_replacement_bus, some manual adjustments are
  # needed for the line diagram. The line diagram should show rail stops only
  @spec maybe_adjust_for_rail_replacement_bus([Stop.t()], RoutePattern.t()) :: [Stop.t()]
  defp maybe_adjust_for_rail_replacement_bus(stops, %RoutePatterns.RoutePattern{
         id: "Shuttle-AlewifeLittleton" <> _
       }),
       do: Enum.reject(stops, &(&1.id == "place-alfcl"))

  defp maybe_adjust_for_rail_replacement_bus(stops, _), do: stops

  @spec has_all_stops?({RoutePattern.t(), [Stop.t()]}, [MapSet.t(Stop.t())]) :: boolean
  defp has_all_stops?({_route_pattern, stops}, all_stop_sets) do
    all_stop_sets
    |> Enum.all?(&MapSet.subset?(&1, MapSet.new(stops)))
  end

  @doc """
  Filters a list of route patterns down to the route patterns sharing the lowest
  number for the "typicality" property, additionally removing route patterns
  associated with a negative shape_priority value.
  """
  @spec filtered_by_typicality([RoutePattern.t()]) :: [RoutePattern.t()]
  def filtered_by_typicality(route_patterns) do
    route_patterns
    |> filter_by_min_typicality()
    # |> Enum.filter(fn x ->
    #   # TODO: Deprecate our use of shape priority entirely,
    #   # because it's no longer supported in the V3 API
    #   # For now, be less strict if using the most typical route pattern
    #   if x.typicality == 1, do: true, else: x.shape_priority > 0
    # end)
  end

  # Filters route patterns by the smallest typicality found in the array
  @spec filter_by_min_typicality([RoutePattern.t()]) :: [RoutePattern.t()]
  defp filter_by_min_typicality(route_patterns) do
    route_patterns
    |> Enum.reduce({nil, []}, &reduce_by_min_typicality/2)
    |> elem(1)
    |> Enum.reverse()
  end

  @spec reduce_by_min_typicality(RoutePattern.t(), {integer, [RoutePattern.t()]}) ::
          {integer, [RoutePattern.t()]}
  defp reduce_by_min_typicality(route_pattern, acc) do
    %RoutePattern{typicality: typicality} = route_pattern
    {min_typicality, patterns_array} = acc

    cond do
      typicality < min_typicality -> {typicality, [route_pattern]}
      typicality == min_typicality -> {min_typicality, [route_pattern | patterns_array]}
      true -> acc
    end
  end

  # Gathers all of the shapes for the route. Green Line has to make a call for each branch separately, because of course
  @spec get_shapes_by_direction(Route.id_t(), Route.type_int(), direction_id) :: [Shape.t()]
  def get_shapes_by_direction(_id, 4, _direction), do: []

  def get_shapes_by_direction(id, 3, direction) do
    case do_get_shapes(id, direction) do
      [head | _] -> [head]
      [] -> []
    end
  end

  def get_shapes_by_direction("Green", _type, direction) do
    GreenLine.branch_ids()
    |> Enum.join(",")
    |> do_get_shapes(direction)
  end

  def get_shapes_by_direction(id, _type, direction), do: do_get_shapes(id, direction)

  @spec do_get_shapes(Route.id_t(), direction_id) :: [Shape.t()]
  def do_get_shapes(route_id, direction_id) do
    RoutesRepo.get_shapes(route_id, direction_id: direction_id)
  end

  @spec get_route_stops(Route.id_t(), direction_id, StopsRepo.stop_by_route()) ::
          stops_by_route()
  def get_route_stops("Green", direction_id, stops_by_route_fn) do
    GreenLine.branch_ids()
    |> Task.async_stream(&do_get_route_stops(&1, direction_id, stops_by_route_fn))
    |> Enum.reduce(%{}, fn {:ok, value}, acc -> Map.merge(acc, value) end)
  end

  def get_route_stops(route_id, direction_id, stops_by_route_fn) do
    do_get_route_stops(route_id, direction_id, stops_by_route_fn)
  end

  @spec do_get_route_stops(Route.id_t(), direction_id, StopsRepo.stop_by_route()) ::
          stops_by_route()
  defp do_get_route_stops(route_id, direction_id, stops_by_route_fn) do
    case stops_by_route_fn.(route_id, direction_id, []) do
      {:error, _} -> %{}
      stops -> %{route_id => stops}
    end
  end

  @doc """
  Gets a list of RouteStops representing all of the branches on the route. Routes without branches will always be a
  list with a single RouteStops struct.
  """
  @spec get_branches([Shape.t()], stops_by_route, Route.t(), direction_id) :: [
          RouteStops.t()
        ]
  def get_branches(_, stops, _, _) when stops == %{}, do: []

  def get_branches(shapes, stops, %Route{id: "Green"}, direction_id) do
    GreenLine.branch_ids()
    |> Enum.map(&get_green_branch(&1, stops[&1], shapes, direction_id))
    |> Enum.reverse()
  end

  def get_branches(shapes, stops, route, direction_id) do
    RouteStops.by_direction(stops[route.id], shapes, route, direction_id)
  end

  @spec get_green_branch(
          GreenLine.branch_name(),
          [Stop.t()],
          [Shape.t()],
          direction_id
        ) :: RouteStops.t()
  defp get_green_branch(branch_id, stops, shapes, direction_id) do
    shape_name =
      branch_id
      |> RoutesRepo.get()
      |> Map.get(:direction_destinations)
      |> Map.values()
      |> Enum.join(" - ")

    branch =
      shapes
      |> Enum.reject(&is_nil(&1.name))
      |> Enum.filter(&(&1.name =~ shape_name))
      |> get_branches(%{branch_id => stops}, %Route{id: branch_id, type: 0}, direction_id)
      |> List.first()

    %{
      branch
      | branch: branch_id,
        stops: Enum.map(branch.stops, &update_green_branch_stop(&1, branch_id))
    }
  end

  @spec update_green_branch_stop(RouteStop.t(), GreenLine.branch_name()) :: RouteStop.t()
  defp update_green_branch_stop(stop, branch_id) do
    # Green line shapes use the headway as their name, so each RouteStop comes back from the repo with their
    # branch set to "Heath St." etc. We change the stop's branch name to nil if the stop is shared, or to the branch
    # id if it's not shared.
    GreenLine.shared_stops()
    |> Enum.member?(stop.id)
    |> do_update_green_branch_stop(stop, branch_id)
  end

  @spec do_update_green_branch_stop(boolean, RouteStop.t(), Route.branch_name()) :: RouteStop.t()
  defp do_update_green_branch_stop(true, stop, _branch_id), do: %{stop | branch: nil}
  defp do_update_green_branch_stop(false, stop, branch_id), do: %{stop | branch: branch_id}

  @spec stops_for_route_pattern(RoutePattern.t()) :: {RoutePattern.t(), [Stop.t()]}
  defp stops_for_route_pattern(route_pattern) do
    stops =
      route_pattern
      |> Map.get(:representative_trip_id)
      |> StopsRepo.by_trip()

    # Enum.each(stops, &IO.inspect(&1.name, label: route_pattern.id))

    {route_pattern, stops}
  end

  @spec get_line_route_patterns(Route.id_t(), direction_id(), RoutePattern.id_t() | nil) :: [
          RoutePattern.t()
        ]
  defp get_line_route_patterns(route_id, direction_id, nil),
    do:
      RoutePatternsRepo.by_route_id(route_id, direction_id: direction_id)
      |> Enum.filter(&(&1.route_id == route_id))

  defp get_line_route_patterns(_route_id, _direction_id, route_pattern_id) do
    case RoutePatternsRepo.get(route_pattern_id) do
      %RoutePattern{} = route_pattern ->
        [route_pattern]

      nil ->
        []
    end
  end

  @spec nil_out_shared_stop_branches([[RouteStop.t()]]) :: [[RouteStop.t()]]
  defp nil_out_shared_stop_branches(route_stop_groups) do
    shared_ids = shared_ids(route_stop_groups)

    Enum.map(route_stop_groups, &do_nil_out_shared_stop_branches(&1, shared_ids))
  end

  @spec do_nil_out_shared_stop_branches([RouteStop.t()], MapSet.t(Stop.id_t())) :: [RouteStop.t()]
  defp do_nil_out_shared_stop_branches(route_pattern_group, shared_ids) do
    Enum.map(route_pattern_group, fn route_stop ->
      if MapSet.member?(shared_ids, route_stop.id) do
        %RouteStop{
          route_stop
          | branch: nil
        }
      else
        route_stop
      end
    end)
  end

  @spec shared_ids([[RouteStop.t()]]) :: MapSet.t(Stop.id_t())
  defp shared_ids(route_stop_groups) do
    stop_id_sets =
      route_stop_groups
      |> Enum.map(fn group ->
        group
        |> Enum.map(& &1.id)
        |> MapSet.new()
      end)

    stop_id_sets
    |> length()
    |> combination_pairs()
    |> Enum.map(&intersection(&1, stop_id_sets))
    |> Enum.reduce(MapSet.new(), fn set, acc -> MapSet.union(set, acc) end)
  end

  @spec intersection([non_neg_integer()], [MapSet.t()]) :: MapSet.t()
  defp intersection(indices, map_sets),
    do: apply(MapSet, :intersection, Enum.map(indices, &Enum.at(map_sets, &1)))

  @doc """
  Generates every combination of pairs for the given number of possibilities.

  Public solely for testing.

  iex> SiteWeb.ScheduleController.Line.Helpers.combination_pairs(4)
  [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3]
  ]
  """
  @spec combination_pairs(non_neg_integer()) :: [[non_neg_integer()]]
  def combination_pairs(count) do
    for i <- 0..(count - 2),
        j <- (i + 1)..(count - 1) do
      [i, j]
    end
  end
end
