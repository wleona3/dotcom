defmodule AWSLocation do
  @moduledoc """
  Functions for interacting with Amazon's Location service, specifocally its Places service.
  """
  alias AWSLocation.Request
  alias LocationService.Result
  require Logger

  @doc """
  Geocodes free-form text, such as an address, name, city, or region to allow
  you to search for Places or points of interest.

  https://docs.aws.amazon.com/location-places/latest/APIReference/API_SearchPlaceIndexForText.html
  """
  @spec geocode(String.t()) :: LocationService.result()
  def geocode(address) when is_binary(address) do
    Request.new(address)
    |> Result.handle_response(address)
  end

  @spec reverse_geocode(number, number) :: LocationService.result()
  def reverse_geocode(latitude, longitude) when is_float(latitude) and is_float(longitude) do
    Request.new([latitude, longitude])
    |> Result.handle_response([latitude, longitude])
  end

  @spec autocomplete(String.t(), number) :: LocationService.Suggestion.result()
  def autocomplete(search, limit) do
    case ExAws.request(%ExAws.Operation.RestQuery{
           http_method: :post,
           body: (AWSLocation.Request.base_request_body
           |> Map.put(:Text, search)
           |> Map.put(:MaxResults, limit)),
           service: :places,
           path: "/places/v0/indexes/dotcom-dev-esri/search/suggestions"
         }) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"Results" => results}} ->
            {
              :ok,
              results
              |> Enum.map(fn %{"Text" => text} ->
                %LocationService.Suggestion{address: text}
              end)
            }

          {:error, error} -> LocationService.Result.internal_error(error, search)
        end

      {:error, error} -> LocationService.Result.internal_error(error, search)
    end
  end
end
