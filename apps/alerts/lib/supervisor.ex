defmodule Alerts.Supervisor do
  @moduledoc """
  Supervisor for the alert app's caching processes. One worker is a process
  that maintans a few ETS tables, and the other worker is a process that periodically
  hits an API and updates the store.

  The supervision strategy is rest for one - if the fetcher crashes, restart it, but leave
  the ETS tables alone. If the ETS process crashes, restart it all.
  """

  use Supervisor

  @api_mfa Application.get_env(:alerts, :api_mfa)

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [])
  end

  @impl Supervisor
  def init(_arg) do
    children =
      [
        Alerts.Cache.Store
      ] ++
        if Application.get_env(:elixir, :start_data_processes) do
          [
            {Alerts.Cache.Fetcher, api_mfa: @api_mfa}
          ]
        else
          []
        end

    Supervisor.init(children, strategy: :rest_for_one)
  end
end
