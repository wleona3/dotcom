defmodule LocationService.Mixfile do
  use Mix.Project

  def project do
    [
      app: :location_service,
      version: "0.1.0",
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
    # Specify extra applications you'll use from Erlang/Elixir
    [
      extra_applications: [:logger],
      mod: {LocationService.Application, []}
    ]
  end

  # Dependencies can be Hex packages:
  #
  #   {:my_dep, "~> 0.3.0"}
  #
  # Or git/path repositories:
  #
  #   {:my_dep, git: "https://github.com/elixir-lang/my_dep.git", tag: "0.1.0"}
  #
  # To depend on another app inside the umbrella:
  #
  #   {:my_app, in_umbrella: true}
  #
  # Type "mix help deps" for more examples and options
  defp deps do
    [
      {:stops, in_umbrella: true},
      {:bypass, "~> 1.0", only: :test},
      {:exvcr_helpers, in_umbrella: true, only: :test},
      # Can replace with release after 2.2.10
      {:ex_aws,
       github: "ex-aws/ex_aws", ref: "08cbbd2aef4ebf52796e48761d1351b5c87c4c5e", override: true}
    ]
  end
end
