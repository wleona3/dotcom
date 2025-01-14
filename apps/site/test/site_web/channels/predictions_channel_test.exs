defmodule SiteWeb.PredictionsChannelTest do
  use SiteWeb.ChannelCase

  import Test.Support.EnvHelpers

  alias Phoenix.Socket
  alias Predictions.Prediction
  alias Routes.Route
  alias Schedules.Trip
  alias Stops.Stop
  alias SiteWeb.{PredictionsChannel, UserSocket}

  @route_39 "39"
  @stop_fh "place-forhl"
  @direction 1

  @prediction39 %Prediction{
    id: "prediction39",
    direction_id: @direction,
    route: %Route{id: @route_39},
    stop: %Stop{id: @stop_fh},
    trip: %Trip{},
    departure_time: Timex.shift(Util.now(), hours: 2)
  }

  setup do
    reassign_env(:site, :predictions_subscribe_fn, fn route_id, _, _ ->
      case route_id do
        @route_39 ->
          [@prediction39]

        _ ->
          []
      end
    end)

    socket = socket(UserSocket, "", %{})

    {:ok, socket: socket}
  end

  describe "join/3" do
    test "subscribes to predictions for a route ID, stop ID, and direction, and returns the current list of predictions",
         %{
           socket: socket
         } do
      assert {:ok, %{predictions: [@prediction39]}, %Socket{}} =
               subscribe_and_join(
                 socket,
                 PredictionsChannel,
                 "predictions:#{@route_39}:#{@stop_fh}:#{@direction}"
               )
    end
  end

  describe "handle_info/2" do
    test "pushes new data onto the socket", %{socket: socket} do
      {:ok, _, socket} =
        subscribe_and_join(
          socket,
          PredictionsChannel,
          "predictions:#{@route_39}:#{@stop_fh}:#{@direction}"
        )

      assert {:noreply, _socket} =
               PredictionsChannel.handle_info(
                 {:new_predictions, [@prediction39]},
                 socket
               )

      assert_push("data", %{predictions: [@prediction39]})
    end
  end
end
