defmodule LocationService.AutocompleteTest do
  use ExUnit.Case, async: true

  import LocationService.Autocomplete
  import Mock

  describe "autocomplete/2" do
    setup do
      old_value = Application.get_env(:location_service, :autocomplete)

      on_exit(fn ->
        Application.put_env(:location_service, :autocomplete, old_value)
      end)
    end

    test "selects function based on application environment variable" do
      with_mocks [
        {LocationService.AWS, [], [autocomplete: fn _, _ -> "i use the amazon one" end]},
        {LocationService.Autocomplete.Private, [],
         [wrapped_google_autocomplete: fn _, _ -> "i use the google one" end]}
      ] do
        Application.put_env(:location_service, :autocomplete, :google)
        assert "i use the google one" = autocomplete("a thing", 2)

        Application.put_env(:location_service, :autocomplete, :aws)
        assert "i use the amazon one" = autocomplete("some other thing", 2)
      end
    end
  end

  describe "wrapped_google_autocomplete/2" do
    test "formats google results" do
      with_mock GoogleMaps.Place,
        autocomplete: fn _ ->
          {:ok,
           [
             %{
               description: "Test"
             }
           ]}
        end do
        {:ok, results} =
          LocationService.Autocomplete.Private.wrapped_google_autocomplete("test", 2)

        assert [
                 %LocationService.Suggestion{
                   address: "Test"
                 }
               ] = results
      end
    end
  end
end
