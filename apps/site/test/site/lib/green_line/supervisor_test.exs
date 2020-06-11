defmodule Site.GreenLine.CacheSupervisorTest do
  use ExUnit.Case

  import Site.GreenLine.CacheSupervisor

  test "CacheSupervisor is started along with registry" do
    assert {:error, {:already_started, _}} = start_link()

    assert {:error, {:already_started, _}} =
             Registry.start_link(keys: :unique, name: :green_line_cache_registry)
  end

  test "can start a child and retrieve it" do
    date = Util.service_date()

    case lookup(date) do
      nil ->
        assert {:ok, pid} = start_child(date)
        assert pid == lookup(date)

      pid ->
        assert pid == lookup(date)
    end
  end
end
