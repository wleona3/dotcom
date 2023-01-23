defmodule Algolia.ApplicationTest do
  use ExUnit.Case, async: true

  describe "start/2" do
    test "can start the application" do
      # should have already been started
      assert {:error, {:already_started, _pid}} = Algolia.Application.start(:permanent, [])
    end
  end
end
