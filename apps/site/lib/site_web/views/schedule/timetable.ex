defmodule SiteWeb.ScheduleView.Timetable do
  alias Schedules.Schedule
  alias SiteWeb.ViewHelpers, as: Helpers
  alias SiteWeb.PartialView.SvgIconWithCircle
  alias Stops.Stop

  import Phoenix.HTML.Tag, only: [content_tag: 3]
  import Phoenix.HTML, only: [safe_to_string: 1]

  @type vehicle_tooltip_key :: {Schedules.Trip.id_t(), Stops.Stop.id_t()}

  @spec stop_tooltip(Schedule.t(), track_change :: String.t() | nil) ::
          nil | [Phoenix.HTML.Safe.t()]
  def stop_tooltip(%Schedule{} = schedule, track_change) do
    stop_type_description = stop_type(schedule)
    track_change_tooltip = track_change_description(track_change)

    [stop_type_description, track_change_tooltip]
    |> Enum.reject(&is_nil(&1))
    |> do_stop_tooltip()
  end

  def stop_tooltip(nil, nil) do
    nil
  end

  defp do_stop_tooltip([]) do
    nil
  end

  defp do_stop_tooltip(contents) do
    content_tag(:p, Enum.join(contents, "<br>"), class: "stop-tooltip")
    |> safe_to_string
    |> String.replace(~s("), ~s('))
  end

  @spec stop_type(Schedule.t()) :: nil | Phoenix.HTML.Safe.t()
  def stop_type(%Schedule{early_departure?: true}) do
    "Early Departure Stop"
  end

  def stop_type(%Schedule{flag?: true}) do
    "Flag Stop"
  end

  def stop_type(_) do
    nil
  end

  @spec track_change_description(String.t() | nil) :: String.t() | nil
  def track_change_description(nil), do: nil

  def track_change_description(track) do
    "Train will board from Track #{track}"
  end

  @spec stop_parking_icon(Stop.t()) :: [Phoenix.HTML.Safe.t()]
  def stop_parking_icon(stop) do
    if length(stop.parking_lots) > 0 do
      [
        content_tag(
          :span,
          Helpers.fa("square-parking"),
          aria: [hidden: "true"],
          class: "m-timetable__parking-icon",
          data: [toggle: "tooltip"],
          title: "Parking available"
        ),
        content_tag(:span, "Parking available", class: "sr-only")
      ]
    else
      [content_tag(:span, "No parking", class: "sr-only")]
    end
  end

  @spec stop_accessibility_icon(Stop.t()) :: [Phoenix.HTML.Safe.t()]
  def stop_accessibility_icon(stop) do
    cond do
      Stop.accessible?(stop) ->
        SvgIconWithCircle.svg_icon_with_circle(%SvgIconWithCircle{icon: :access})

      Stop.accessibility_known?(stop) ->
        [
          content_tag(:span, "Not accessible", class: "sr-only")
        ]

      true ->
        [
          content_tag(:span, "May not be accessible", class: "sr-only")
        ]
    end
  end

  @spec stop_row_class(integer) :: String.t()
  def stop_row_class(idx) do
    ["js-tt-row", "m-timetable__row"]
    |> do_stop_row_class(idx)
    |> Enum.join(" ")
  end

  @spec do_stop_row_class([String.t()], integer) :: [String.t()]
  defp do_stop_row_class(class_list, 0) do
    ["m-timetable__row--first" | class_list]
  end

  defp do_stop_row_class(class_list, idx) when rem(idx, 2) == 1 do
    ["m-timetable__row--gray" | class_list]
  end

  defp do_stop_row_class(class_list, _) do
    class_list
  end

  @spec cell_flag_class(Schedule.t()) :: String.t()
  def cell_flag_class(%Schedule{flag?: true}), do: " m-timetable__cell--flag-stop"

  def cell_flag_class(%Schedule{early_departure?: true}),
    do: " m-timetable__cell--early-departure"

  def cell_flag_class(_), do: ""

  @spec cell_via_class(String.t() | nil) :: String.t()
  def cell_via_class(nil), do: ""
  def cell_via_class(<<_::binary>>), do: " m-timetable__cell--via"

  @spec is_ferry(Route.t()) :: boolean
  def is_ferry(route), do: Routes.Route.type_atom(route) == :ferry

  @spec is_commuter_rail(Route.t()) :: boolean
  def is_commuter_rail(route), do: Routes.Route.type_atom(route) == :commuter_rail
end
