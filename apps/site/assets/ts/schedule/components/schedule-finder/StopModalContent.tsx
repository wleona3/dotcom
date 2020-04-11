import React, { ReactElement, useState } from "react";
import { SimpleStop, SelectedStop } from "../__schedule";
import StopListItem from "./StopListItem";
import SearchBox from "../../../components/SearchBox";

const stopListSearchFilter = (
  stops: SimpleStop[],
  StopSearch: string
): SimpleStop[] => {
  if (StopSearch.trim() === "") {
    return stops;
  }

  const streetSuffixRegExp = /( s| st| | st\.| str| stre| stree| street)$/gi;
  const cleanSearch = StopSearch.trim().replace(streetSuffixRegExp, "");

  const regExp = new RegExp(cleanSearch, "gi");
  return stops.filter(stop => (stop.name.match(regExp) || []).length > 0);
};

interface Props {
  selectedStop: SelectedStop;
  stops: SimpleStop[];
  handleChangeStop: Function;
}

const StopModalContent = ({
  selectedStop,
  stops,
  handleChangeStop
}: Props): ReactElement<HTMLElement> => {
  const [StopSearch, setStopSearch] = useState("");

  return (
    <>
      <br />
      <h3 className="schedule-finder__Stop-text">Choose an Stop stop</h3>
      <SearchBox
        id="Stop-filter"
        labelText="Choose an Stop stop"
        className="schedule-finder__Stop-search-container"
        placeholder="Filter stops and stations"
        onChange={setStopSearch}
      />
      <p className="schedule-finder__Stop-text">Select from the list below.</p>
      <div className="schedule-finder__Stop-list">
        {stopListSearchFilter(stops, StopSearch).map((stop: SimpleStop) => (
          <StopListItem
            key={stop.id}
            stop={stop}
            changeStop={handleChangeStop}
            selectedStop={selectedStop}
            lastStop={stops[stops.length - 1]}
          />
        ))}
      </div>
    </>
  );
};

export default StopModalContent;
