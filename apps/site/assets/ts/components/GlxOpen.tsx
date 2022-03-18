import React, { ReactElement, useState, useEffect } from "react";
import renderSvg from "../helpers/render-svg";
import glxLogo from "../../static/images/glx-logo.svg";

type GlxOpenStatus = [boolean, string] | false;

export const getIsGlxOpen = (stationId: string): GlxOpenStatus => {
  if (!document) return false;

  const glxStationsOpen = document.querySelector(".glx-stations-open");

  if (
    glxStationsOpen instanceof HTMLElement &&
    glxStationsOpen.dataset.stations && glxStationsOpen.dataset.opening
  ) {
    const {stations, opening} = glxStationsOpen.dataset;
    return [stations.includes(stationId), opening];
  }
  return false;
};

const glxLogoElement = (pageType: string): JSX.Element | null => {
  if (pageType === "schedule-finder") return null;

  return renderSvg("glx-logo", glxLogo);
};

const GlxOpen = ({
  pageType,
  stopId
}: {
  pageType: "station-page" | "schedule-finder" | "line-diagram";
  stopId: string;
}): ReactElement<HTMLElement> | null => {
  const [isGlxOpen, setIsGlxOpen] = useState<GlxOpenStatus>(false);
  useEffect(() => {
    setIsGlxOpen(getIsGlxOpen(stopId));
  }, [stopId]);
  let textContent;

  if (pageType === "station-page") {
    textContent = "STATION NOW OPEN";
  } else {
    textContent = "NOW OPEN";
  }

  if (isGlxOpen) {
    return (
      <div className="glx-open-container">
        {glxLogoElement(pageType)}
        <span className="glx-open-message">{textContent}</span>
      </div>
    );
  }

  return null;
};

export default GlxOpen;
