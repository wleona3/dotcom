defmodule SiteWeb.ScheduleController.LineApi do
  @moduledoc "Provides JSON endpoints for retrieving line diagram data."
  use SiteWeb, :controller

  alias Alerts.Match
  alias Alerts.Stop, as: AlertsStop
  alias RoutePatterns.RoutePattern
  alias Routes.Route
  # alias Predictions.Prediction
  alias Schedules.Repo, as: SchedulesRepo
  alias Site.TransitNearMe
  alias SiteWeb.ScheduleController.Line.DiagramFormat
  alias SiteWeb.ScheduleController.Line.DiagramHelpers
  alias SiteWeb.ScheduleController.Line.Helpers, as: LineHelpers
  alias Stops.Repo, as: StopsRepo
  alias Stops.{RouteStop, Stop}
  alias Vehicles.Repo, as: VehiclesRepo
  alias Vehicles.Vehicle

  import SiteWeb.StopController, only: [json_safe_alerts: 2]

  @typep simple_vehicle :: %{
           id: String.t(),
           headsign: String.t() | nil,
           status: String.t(),
           trip_name: String.t() | nil,
           crowding: Vehicle.crowding() | nil
         }

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => route_id, "direction_id" => direction_id}) do
    case LineHelpers.get_route(route_id) do
      {:ok, route} ->
        conn =
          conn
          |> assign(:route, route)
          |> assign(:direction_id, direction_id)
          |> assign_alerts(filter_by_direction?: true)

        line_data =
          get_line_data(
            route,
            String.to_integer(direction_id),
            conn.query_params["route_pattern"]
          )

        json(
          conn,
          update_route_stop_data(line_data, conn.assigns.alerts, conn.assigns.date_time)
        )

      :not_found ->
        return_invalid_arguments_error(conn)
    end
  end

  @doc """
  Provides predictions and vehicle information for a given route and direction, organized by stop.
  The line diagram polls this endpoint for its real-time data.
  """
  @spec realtime(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def realtime(conn, %{"id" => route_id, "direction_id" => direction_id}) do
    cache_key = {route_id, direction_id, conn.assigns.date_time}

    payload =
      ConCache.get_or_store(:line_diagram_realtime_cache, cache_key, fn ->
        do_realtime(route_id, direction_id, conn.assigns.date_time)
      end)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, payload)
  end

  defp do_realtime(route_id, direction_id, now) do
    headsigns_by_stop =
      headsigns_by_stop(
        route_id,
        String.to_integer(direction_id),
        now: now
      )

    vehicles_by_stop =
      route_id
      |> expand_route_id()
      |> Stream.flat_map(&VehiclesRepo.route(&1, direction_id: String.to_integer(direction_id)))
      |> Stream.map(&update_vehicle_with_parent_stop(&1))
      |> Enum.group_by(& &1.stop_id)

    combined_data_by_stop =
      Map.keys(headsigns_by_stop)
      |> Stream.concat(Map.keys(vehicles_by_stop))
      |> Stream.uniq()
      |> Stream.map(fn stop_id ->
        {stop_id,
         %{
           headsigns: Map.get(headsigns_by_stop, stop_id, []),
           vehicles: Map.get(vehicles_by_stop, stop_id, []) |> Enum.map(&simple_vehicle_map(&1))
         }}
      end)
      |> Enum.into(%{})

    Jason.encode!(combined_data_by_stop)
  end

  # @type enhanced_time_data_by_stop :: %{
  #         Stop.id_t() => [enhanced_time_data()]
  #       }

  # @type enhanced_time_data :: %{
  #         # Headsign name
  #         name: String.t(),
  #         time_data_with_crowding_list: [
  #           time_data_with_crowding()
  #         ],
  #         train_number: String.t() | nil
  #       }

  # @type time_data_with_crowding :: %{
  #         time_data: time_data(),
  #         crowding: Vehicle.crowding() | nil,
  #         predicted_schedule: PredictedSchedule
  #       }

  # @type time_data :: %{
  #         required(:scheduled_time) => [String.t()] | nil,
  #         required(:prediction) => simple_prediction() | nil,
  #         required(:delay) => integer
  #       }

  # @type simple_prediction :: %{
  #         required(:seconds) => integer,
  #         required(:time) => [String.t()],
  #         required(:status) => String.t() | nil,
  #         required(:track) => String.t() | nil,
  #         required(:schedule_relationship) => Prediction.schedule_relationship()
  #       }

  @doc """
  Gets all schedules for a route and compiles appropriate headsign_data for each stop.
  Returns a map indexed by stop_id
  """
  ######### formerly time_data_for_route_by_stop
  @spec headsigns_by_stop(Route.id_t(), 1 | 0, Keyword.t()) ::
          headsigns_by_stop()
  def headsigns_by_stop(route_id, direction_id, opts) do
    opts = Keyword.put(opts, :direction_id, direction_id)
    now = Keyword.fetch!(opts, :now)

    PredictedSchedule.Repo.get(route_id, nil, opts)
    |> Enum.filter(
      &(!PredictedSchedule.last_stop?(&1) and TransitNearMe.after_min_time?(&1, now))
    )
    |> Enum.group_by(&PredictedSchedule.stop(&1).id)
    |> do_headsigns_by_stop()
  end

  @type headsign_data :: %{
          headsign_name: Trip.headsign() | nil,
          trip_name: String.t() | nil,
          status: String.t() | nil,
          track: String.t() | nil,
          vehicle_crowding: Vehicles.Vehicle.crowding() | nil,
          predicted_time: DateTime.t() | nil,
          scheduled_time: DateTime.t() | nil,
          delay: integer(),
          skipped_or_cancelled: boolean()
        }

  @type headsigns_by_stop :: %{
          Stop.id_t() => [headsign_data()]
        }

  @spec do_headsigns_by_stop(%{
          Stop.id_t() => [PredictedSchedule.t()]
        }) :: headsigns_by_stop()
  defp do_headsigns_by_stop(predicted_schedules_by_stop) do
    for {stop_id, predicted_schedules} <- predicted_schedules_by_stop, into: %{} do
      headsigns =
        predicted_schedules
        |> Enum.map(&PredictedSchedule.headsign_data(&1))

      {stop_id, headsigns}
    end
  end

  @spec expand_route_id(Route.id_t()) :: [Route.id_t()]
  defp expand_route_id("Green"), do: GreenLine.branch_ids()
  defp expand_route_id(route_id), do: [route_id]

  @spec get_line_data(Route.t(), LineHelpers.direction_id(), RoutePattern.id_t() | nil) :: [
          DiagramHelpers.stop_with_bubble_info()
        ]
  defp get_line_data(route, direction_id, route_pattern_id) do
    diagram_direction = RouteStop.reverse_direction_for_ferry(route.id, direction_id)

    route
    |> LineHelpers.get_branch_route_stops(direction_id, route_pattern_id)
    |> DiagramHelpers.build_stop_list(diagram_direction)
  end

  @doc """
  Builds a dataset for the line diagram from line_data, alerts, and the current
  datetime.
  * Selects alerts to associate with each stop based on stop_id and datetime
  * Creates a stop_data map to encode information relating to the stop on the
    diagram itself - branch name, stop/line/terminus/merge, and whether it needs
    to show a disruption
  """
  @spec update_route_stop_data(
          [
            DiagramHelpers.stop_with_bubble_info()
          ],
          [Alerts.Alert.t()],
          DateTime.t()
        ) :: [DiagramFormat.line_diagram_stop()]
  def update_route_stop_data(all_stops, alerts, date) do
    Enum.map(all_stops, fn stop ->
      compose_route_stop_data(stop, alerts, date)
    end)
    |> DiagramFormat.do_stops_list_with_disruptions(date)
    |> json_safe_route_stop_data(date)
  end

  @spec compose_route_stop_data(any, any, DateTime.t()) :: any
  defp compose_route_stop_data({data, %RouteStop{id: stop_id} = route_stop}, alerts, date) do
    %{
      alerts:
        alerts
        |> Enum.filter(&Match.any_time_match?(&1, date))
        |> AlertsStop.match(stop_id),
      route_stop: route_stop,
      stop_data:
        Enum.map(data, fn {key, value} -> %{branch: key, type: value, has_disruption?: false} end)
    }
  end

  @spec json_safe_route_stop_data([DiagramFormat.line_diagram_stop()], DateTime.t()) :: [
          DiagramFormat.line_diagram_stop()
        ]
  defp json_safe_route_stop_data(all_stops, date) do
    all_stops
    |> Enum.map(fn %{alerts: alerts, route_stop: route_stop} = stop_map ->
      %{
        stop_map
        | alerts: json_safe_alerts(alerts, date),
          route_stop: RouteStop.to_json_safe(route_stop)
      }
    end)
  end

  @spec simple_vehicle_map(Vehicle.t()) :: simple_vehicle
  defp simple_vehicle_map(%Vehicle{id: id, status: status, trip_id: trip_id, crowding: crowding}) do
    case SchedulesRepo.trip(trip_id) do
      nil ->
        %{id: id, status: status}

      %{headsign: headsign, name: name} ->
        %{
          id: id,
          headsign: headsign,
          status: status,
          trip_name: name,
          crowding: crowding
        }
    end
  end

  @spec update_vehicle_with_parent_stop(Vehicle.t()) :: Vehicle.t()
  defp update_vehicle_with_parent_stop(vehicle) do
    case StopsRepo.get_parent(vehicle.stop_id) do
      nil -> vehicle
      parent_stop -> %{vehicle | stop_id: parent_stop.id}
    end
  end
end
