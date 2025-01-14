defmodule Predictions do
  @moduledoc """
  Supervisor for the Predictions application.

  Children include:
  - StreamSupervisor: Dynamically sets up per-route streams of predictions from the API.
  - Repo: Manages ad-hoc API requests.
  """

  use Application

  # See http://elixir-lang.org/docs/stable/elixir/Application.html
  # for more information on OTP Applications
  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    # Define workers and child supervisors to be supervised
    children = [
      # can update to this syntax after upgrading Phoenix to 1.5+
      # {Phoenix.PubSub, [name: Predictions.PubSub, adapter: Phoenix.PubSub.PG2]},
      %{
        id: Predictions.PubSub,
        start:
          {Phoenix.PubSub.PG2, :start_link,
           [[name: Predictions.PubSub, adapter: Phoenix.PubSub.PG2]]}
      },
      {Registry, keys: :unique, name: :prediction_streams_registry},
      {Registry, keys: :duplicate, name: :prediction_subscriptions_registry},
      Predictions.StreamSupervisor,
      Predictions.PredictionsPubSub,
      Predictions.Repo
    ]

    # See http://elixir-lang.org/docs/stable/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Predictions.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
