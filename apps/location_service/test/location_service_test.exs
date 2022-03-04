defmodule LocationServiceTest do
  use ExUnit.Case, async: false

  import LocationService
  import Mock

  describe "geocode/1" do
    setup do
      old_value = Application.get_env(:location_service, :geocode)

      on_exit(fn ->
        Application.put_env(:location_service, :geocode, old_value)
      end)
    end

    test "selects function based on application environment variable" do
      with_mocks [
        {AWSLocation, [], [geocode: fn _ -> "i use the amazon one" end]},
        {GoogleMaps.Geocode, [], [geocode: fn _ -> "i use the google one" end]}
      ] do
        Application.put_env(:location_service, :geocode, :google)
        assert "i use the google one" = geocode("a thing")

        Application.put_env(:location_service, :geocode, :aws)
        assert "i use the amazon one" = geocode("some other thing")
      end
    end

    test "uses cache" do
      # return the input address along with the time the function evaluates.
      mock_return_address = fn address -> {address, DateTime.utc_now()} end

      with_mocks [
        {AWSLocation, [], [geocode: mock_return_address]},
        {GoogleMaps.Geocode, [], [geocode: mock_return_address]}
      ] do
        Application.put_env(:location_service, :geocode, :aws)
        address1 = "a first place"
        {^address1, time1} = geocode(address1)
        :timer.sleep(1000)
        {^address1, time2} = geocode(address1)
        # the second call should return the cached result
        assert DateTime.compare(time1, time2) == :eq

        Application.put_env(:location_service, :geocode, :google)
        address2 = "another place"
        {^address2, time3} = geocode(address2)
        :timer.sleep(1000)
        {^address2, time4} = geocode(address2)
        assert DateTime.compare(time3, time4) == :eq
      end
    end
  end

  describe "reverse_geocode/1" do
    setup do
      old_value = Application.get_env(:location_service, :reverse_geocode)

      on_exit(fn ->
        Application.put_env(:location_service, :reverse_geocode, old_value)
      end)
    end

    test "selects function based on application environment variable" do
      with_mocks [
        {AWSLocation, [], [reverse_geocode: fn _, _ -> "i use the amazon one" end]},
        {GoogleMaps.Geocode, [], [reverse_geocode: fn _, _ -> "i use the google one" end]}
      ] do
        Application.put_env(:location_service, :reverse_geocode, :google)
        assert "i use the google one" = reverse_geocode(71.56890, -68.5285)

        Application.put_env(:location_service, :reverse_geocode, :aws)
        assert "i use the amazon one" = reverse_geocode(71.56890, 40.5285)
      end
    end

    test "uses cache" do
      # return the input coordinates along with the time the function evaluates.
      mock_return_coordinates = fn lat, long -> {lat, long, DateTime.utc_now()} end

      with_mocks [
        {AWSLocation, [], [reverse_geocode: mock_return_coordinates]},
        {GoogleMaps.Geocode, [], [reverse_geocode: mock_return_coordinates]}
      ] do
        Application.put_env(:location_service, :reverse_geocode, :aws)
        lat1 = 71.596
        long1 = -68.321
        {^lat1, ^long1, time1} = reverse_geocode(lat1, long1)
        :timer.sleep(1000)
        {^lat1, ^long1, time2} = reverse_geocode(lat1, long1)
        # the second call should return the cached result
        assert DateTime.compare(time1, time2) == :eq

        Application.put_env(:location_service, :reverse_geocode, :google)
        lat2 = 42.0
        long2 = 71.55
        {^lat2, ^long2, time3} = reverse_geocode(lat2, long2)
        :timer.sleep(1000)
        {^lat2, ^long2, time4} = reverse_geocode(lat2, long2)
        assert DateTime.compare(time3, time4) == :eq
      end
    end
  end
end
