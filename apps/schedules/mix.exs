defmodule Schedules.Mixfile do
  use Mix.Project

  def project do
    [
      app: :schedules,
      version: "0.0.1",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      build_embedded: Mix.env() == :prod,
      start_permanent: Mix.env() == :prod,
      test_coverage: [tool: ExCoveralls],
      deps: deps()
    ]
  end

  # Configuration for the OTP application
  #
  # Type "mix help compile.app" for more information
  def application do
    [
      applications: [
        :logger,
        :v3_api,
        :timex,
        :repo_cache,
        :tzdata,
        :util,
        :routes,
        :stops,
        :services
      ],
      mod: {Schedules, []}
    ]
  end

  # Dependencies can be Hex packages:
  #
  #   {:mydep, "~> 0.3.0"}
  #
  # Or git/path repositories:
  #
  #   {:mydep, git: "https://github.com/elixir-lang/mydep.git", tag: "0.1.0"}
  #
  # To depend on another app inside the umbrella:
  #
  #   {:myapp, in_umbrella: true}
  #
  # Type "mix help deps" for more examples and options
  defp deps do
    [
      {:v3_api, in_umbrella: true},
      {:timex, ">= 0.0.0"},
      {:repo_cache, in_umbrella: true},
      {:routes, in_umbrella: true},
      {:stops, in_umbrella: true},
      {:quixir, "~> 0.9", only: :test},
      {:benchfella, "~> 0.3", only: :dev},
      {:util, in_umbrella: true}
    ]
  end
end
