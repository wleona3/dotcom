defmodule Algolia.Analytics do
  @moduledoc """
  Handles sending analytics data to Algolia base on interactions with search results.
  """
  require Logger

  @http_pool Application.get_env(:algolia, :http_pool)

  @spec click(%{String.t() => String.t() | integer}) :: :ok | {:error, any}
  def click(%{"position" => <<pos::binary>>} = params) do
    case Integer.parse(pos) do
      {int, ""} when int > 0 ->
        params
        |> Map.put("position", int)
        |> click()

      _ ->
        {:error, %{reason: :bad_params, params: params}}
    end
  end

  def click(%{"objectID" => _, "position" => pos, "queryID" => _} = params)
      when is_integer(pos) do
    :algolia
    |> Application.get_env(:click_analytics_url)
    |> send_click(params, Application.get_env(:algolia, :track_clicks?, false))
  end

  def click(params) do
    {:error, %{reason: :bad_params, params: params}}
  end

  defp send_click(url, params, send_to_algolia?)

  defp send_click(_url, _params, false) do
    :ok
  end

  defp send_click("http" <> _ = url, params, true) do
    {:ok, json} = Poison.encode(params)

    path = Path.join(url, "1/searches/click")

    _ = Logger.info("module=#{__MODULE__} path=#{path} method=POST params=#{json}")

    path
    |> HTTPoison.post(json, post_headers(), hackney: [pool: @http_pool])
    |> handle_click_response(json)
  end

  defp handle_click_response({:ok, %HTTPoison.Response{status_code: 200}}, _) do
    :ok
  end

  defp handle_click_response({:ok, %HTTPoison.Response{} = response}, body) do
    _ =
      Logger.warn(
        "module=#{__MODULE__} Bad response from Algolia: #{inspect(response)} request body: #{body}"
      )

    {:error, response}
  end

  defp handle_click_response({:error, %HTTPoison.Error{} = response}, _) do
    _ = Logger.warn("module=#{__MODULE__} Error connecting to Algolia: #{inspect(response)}")
    {:error, response}
  end

  defp post_headers do
    %Algolia.Config{app_id: <<app_id::binary>>, write: <<write_key::binary>>} =
      Algolia.Config.config()

    [
      {"X-Algolia-Application-Id", app_id},
      {"X-Algolia-API-Key", write_key},
      {"Content-Type", "application/json"}
    ]
  end
end
