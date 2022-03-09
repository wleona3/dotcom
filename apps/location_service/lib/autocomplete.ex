defmodule LocationService.Autocomplete do
  defmodule Private do
    @spec wrapped_google_autocomplete(String.t(), number) ::
            {:ok, [LocationService.Prediction.t()]} | {:error}
    def wrapped_google_autocomplete(search, limit) do
      {:ok, results} =
        GoogleMaps.Place.autocomplete(%GoogleMaps.Place.AutocompleteQuery{
          hit_limit: limit,
          input: search,
          session_token: ""
        })

      {:ok,
       results
       |> Enum.map(fn p ->
         %LocationService.Suggestion{address: p.description}
       end)}
    end
  end

  @doc "Uses either AWS Location Service or Google Maps Place API to do
  autocompletion, selecting based on config value."
  @spec autocomplete(String.t(), number) :: {:ok, [LocationService.Prediction.t()]} | {:error}
  def autocomplete(search, limit) do
    case Application.get_env(:location_service, :autocomplete) do
      :aws -> LocationService.AWS.autocomplete(search, limit)
      _ -> Private.wrapped_google_autocomplete(search, limit)
    end
  end
end
