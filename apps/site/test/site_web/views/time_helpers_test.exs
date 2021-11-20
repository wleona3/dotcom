defmodule SiteWeb.TimeHelpersTest do
  use ExUnit.Case, async: true

  import SiteWeb.TimeHelpers

  describe "format_date/1" do
    test "parses the date and returns a string" do
      assert format_date(~N[2017-01-15T12:00:00]) == "January 15, 2017"
    end
  end

  describe "format_prediction_time/4" do
    @now ~N[2021-11-11T12:34:58]
    @predicted_time_nearest Timex.shift(@now, seconds: 27)
    @predicted_time_near Timex.shift(@now, seconds: 57)
    @predicted_time_far Timex.shift(@now, minutes: 7)

    test "commuter rail - parses the time and returns a string" do
      assert format_prediction_time(@predicted_time_nearest, @now, :commuter_rail) == "12:35 PM"
      assert format_prediction_time(@predicted_time_near, @now, :commuter_rail) == "12:35 PM"
      assert format_prediction_time(@predicted_time_far, @now, :commuter_rail) == "12:41 PM"
    end

    test "subway - parses the time and returns a string" do
      assert format_prediction_time(@predicted_time_nearest, @now, :subway) == "arriving"
      assert format_prediction_time(@predicted_time_near, @now, :subway) == "1 min"
      assert format_prediction_time(@predicted_time_far, @now, :subway) == "7 min"
    end

    test "bus - parses the time and returns a string" do
      assert format_prediction_time(@predicted_time_nearest, @now, :bus) == "arriving"
      assert format_prediction_time(@predicted_time_near, @now, :bus) == "arriving"
      assert format_prediction_time(@predicted_time_far, @now, :bus) == "7 min"
    end
  end

  describe "format_time/1" do
    test "parses the time and returns a string" do
      assert format_time(~N[2017-01-15T12:00:00]) == "12 PM"
      assert format_time(~N[2017-01-15T12:09:00]) == "12:09 PM"
    end
  end

  describe "do_time_difference/4" do
    @base_time ~N[2017-01-01T12:00:00]

    test "difference above threshold" do
      actual =
        do_time_difference(
          Timex.shift(@base_time, minutes: 30),
          Timex.shift(@base_time, minutes: 28),
          fn _time -> "format time" end,
          1
        )

      assert actual == "format time"
    end

    test "difference below threshold" do
      actual =
        do_time_difference(
          Timex.shift(@base_time, minutes: 30),
          Timex.shift(@base_time, minutes: 28),
          fn _time -> "format time" end
        )

      assert actual == "2 min"
    end
  end

  describe "format_schedule_time/1" do
    test "parses the time and returns a string" do
      assert format_schedule_time(~N[2017-01-15T12:00:00]) == "12:00 PM"
    end
  end
end
