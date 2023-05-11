defmodule SiteWeb.Schedule.TimetableViewTest do
  use ExUnit.Case, async: true
  import SiteWeb.ScheduleView.Timetable
  alias Schedules.Schedule
  import Phoenix.ConnTest, only: [build_conn: 0]
  import Phoenix.HTML, only: [safe_to_string: 1]

  describe "stop_tooltip/4" do
    @expected_flag "Flag Stop"
    @expected_delayed "Early Departure Stop"

    test "returns nil when there are no matches" do
      assert nil == stop_tooltip(%Schedule{})
    end

    test "returns only a flag stop" do
      actual = stop_tooltip(%Schedule{flag?: true})
      assert actual =~ @expected_flag
      refute actual =~ @expected_delayed
    end

    test "returns only an early departure" do
      actual = stop_tooltip(%Schedule{early_departure?: true})
      refute actual =~ @expected_flag
      assert actual =~ @expected_delayed
    end
  end

  describe "_timetable.html" do
    setup do
      conn = %{build_conn() | query_params: %{}}
      date = ~D[2018-01-01]
      headsigns = %{0 => ["Headsign"]}
      offset = 0
      route = %Routes.Route{direction_destinations: %{0 => "End"}}
      direction_id = 0
      origin = destination = nil
      alerts = []

      all_stops = [
        %Stops.Stop{id: "stop", name: "Stop"}
      ]

      vehicle_tooltips = vehicle_locations = trip_messages = trip_schedules = %{}
      show_date_select? = false

      assigns = [
        conn: conn,
        channel: "fakeId",
        vehicle_schedules: [],
        prior_stops: [],
        date: date,
        headsigns: headsigns,
        route: route,
        direction_id: direction_id,
        origin: origin,
        destination: destination,
        alerts: alerts,
        offset: offset,
        show_date_select?: show_date_select?,
        all_stops: all_stops,
        vehicle_tooltips: vehicle_tooltips,
        vehicle_locations: vehicle_locations,
        trip_messages: trip_messages,
        trip_schedules: trip_schedules,
        track_changes: %{},
        date_time: ~N[2017-03-01T07:29:00],
        direction_name: "Southeastbound",
        formatted_date: "March 1, 2017"
      ]

      {:ok, %{assigns: assigns}}
    end

    test "does not render the earlier/later train columns when there is one schedule", %{
      assigns: assigns
    } do
      trip = %Schedules.Trip{name: "name"}

      header_schedules = [
        %Schedules.Schedule{trip: trip}
      ]

      assigns = Keyword.put(assigns, :header_schedules, header_schedules)
      rendered = SiteWeb.ScheduleView.render("_timetable.html", assigns)
      refute safe_to_string(rendered) =~ "Earlier Trains"
      refute safe_to_string(rendered) =~ "Later Trains"
    end

    test "renders the earlier/later train columns when there are two or more schedules", %{
      assigns: assigns
    } do
      trip = %Schedules.Trip{name: "name"}

      header_schedules = [
        %Schedules.Schedule{trip: trip},
        %Schedules.Schedule{trip: trip}
      ]

      assigns = Keyword.put(assigns, :header_schedules, header_schedules)
      rendered = SiteWeb.ScheduleView.render("_timetable.html", assigns)
      assert safe_to_string(rendered) =~ "Earlier Trains"
      assert safe_to_string(rendered) =~ "Later Trains"
    end

    test "should show the track change information if present", %{assigns: assigns} do
      trip = %Schedules.Trip{name: "Test Trip", id: "Test-Trip-ID"}

      all_stops = [
        %Stops.Stop{id: "Test-Stop-ID", name: "Stop"}
      ]

      track_changes = %{{"Test-Trip-ID", "Test-Stop-ID"} => "Track Change"}
      header_schedules = [%Schedules.Schedule{trip: trip}]
      trip_schedules = %{{"Test-Trip-ID", "Test-Stop-ID"} => %Schedules.Schedule{trip: trip}}

      assigns =
        Keyword.merge(assigns,
          header_schedules: header_schedules,
          track_changes: track_changes,
          all_stops: all_stops,
          trip_schedules: trip_schedules
        )

      rendered = SiteWeb.ScheduleView.render("_timetable.html", assigns)
      assert safe_to_string(rendered) =~ "Track Change"
    end
  end
end
