defmodule Alerts.Mixfile do
  use Mix.Project

  def project do
    [
      app: :alerts,
      version: "0.0.1",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      build_embedded: Mix.env() == :prod,
      start_permanent: Mix.env() == :prod,
      test_coverage: [tool: ExCoveralls],
      elixirc_paths: elixirc_paths(Mix.env()),
      deps: deps()
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Configuration for the OTP application
  #
  # Type "mix help compile.app" for more information
  def application do
    [
      extra_applications: [:logger],
      mod: {Alerts, []}
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
      {:repo_cache, in_umbrella: true},
      {:routes, in_umbrella: true},
      {:stops, in_umbrella: true},
      {:con_cache, "~> 0.12.0"},
      {:timex, ">= 0.0.0"},
      {:util, in_umbrella: true},
      {:quixir, "~> 0.9", only: :test},
      {:benchfella, "~> 0.3", only: :dev},
      {:ex_aws, "~> 2.4", only: [:prod, :dev]},
      {:ex_aws_s3, "~> 2.4", only: [:prod, :dev]},
      {:sweet_xml, "~> 0.7.1", only: [:prod, :dev]}
    ]
  end
end
