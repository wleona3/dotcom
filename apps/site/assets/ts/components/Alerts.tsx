import React, { ReactElement, useState } from "react";
import { Alert as AlertType, Lifecycle } from "../__v3api";
import { handleReactEnterKeyPress } from "../helpers/keyboard-events";
import { caret } from "../helpers/icon";
import renderSVG from "../helpers/render-svg";
import shuttleIcon from "../../static/images/icon-shuttle-default.svg";
import cancelIcon from "../../static/images/icon-cancelled-default.svg";
import snowIcon from "../../static/images/icon-snow-default.svg";
import alertIcon from "../../static/images/icon-alerts-triangle.svg";

interface Props {
  alerts: AlertType[];
}

const alertClassNames = (
  { priority, description }: AlertType,
  expanded: boolean
): string => {
  const classNames = `c-alert-item c-alert-item--${priority}`;
  if (description) {
    if (expanded) {
      return `${classNames} c-alert-item--expandable c-alert-item--open`;
    }
    return `${classNames} c-alert-item--expandable c-alert-item--closed`;
  }
  return classNames;
};

export const iconForAlert = ({
  priority,
  effect
}: AlertType): ReactElement<HTMLElement> | null => {
  if (priority === "low") return null;
  if (priority === "system")
    return renderSVG("c-svg__icon-alerts-triangle", alertIcon);
  switch (effect) {
    case "suspension":
    case "cancellation":
      return renderSVG("c-svg__icon-cancelled-default", cancelIcon);
    case "snow_route":
      return renderSVG("c-svg__icon-snow-default", snowIcon);
    case "shuttle":
      return renderSVG("c-svg__icon-shuttle-default", shuttleIcon);
    default:
      return renderSVG("c-svg__icon-alerts-triangle", alertIcon);
  }
};

const humanLifecycle = (lifecycle: Lifecycle): string | null => {
  switch (lifecycle) {
    case "new":
    case "unknown":
      return null;
    case "upcoming":
    case "ongoing_upcoming":
      return "Upcoming";
    case "ongoing":
      return "Ongoing";
    default:
      return null;
  }
};

export const humanLabelForAlert = ({
  effect,
  severity,
  lifecycle
}: AlertType): string | null => {
  if (effect === "delay") {
    switch (severity) {
      case 0:
      case 1:
      case 2:
        return null;
      case 3:
        return "up to 10 minutes";
      case 4:
        return "up to 15 minutes";
      case 5:
        return "up to 20 minutes";
      case 6:
        return "up to 25 minutes";
      case 7:
        return "up to 30 minutes";
      case 8:
        return "30+ minutes";
      case 9:
        return "more than an hour";
      default:
        return humanLifecycle(lifecycle);
    }
  }
  return humanLifecycle(lifecycle);
};

export const alertLabel = (alert: AlertType): ReactElement<HTMLElement> => {
  const alertClasses = ["u-small-caps", "c-alert-item__badge"];
  if (alert.priority === "system") {
    alertClasses.push("c-alert-item__badge--system");
  }
  if (
    alert.lifecycle === "upcoming" ||
    alert.lifecycle === "ongoing_upcoming"
  ) {
    alertClasses.push("c-alert-item__badge--upcoming");
  }
  return (
    <span className={alertClasses.join(" ")}>{humanLabelForAlert(alert)}</span>
  );
};

export const effectNameForAlert = (alert: AlertType): string =>
  alert.effect
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const caretIcon = (
  noDescription: boolean,
  expanded: boolean
): ReactElement<HTMLElement> | null => {
  if (noDescription) return null;
  return caret("c-expandable-block__header-caret--black", expanded);
};

const alertDescription = (alert: AlertType): ReactElement<HTMLElement> => (
  <div
    className={`c-alert-item__bottom c-alert-item__buttom--${alert.priority}`}
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    tabIndex={0}
    role="region"
    aria-labelledby={`alert-${alert.id}`}
    ref={panel => panel && panel.focus()}
  >
    <div className="c-alert-item__description">
      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: alert.description
        }}
      />
      <div className="c-alert-item__updated">{alert.updated_at}</div>
    </div>
  </div>
);

 export const Alert = ({ alert }: { alert: AlertType }): ReactElement<HTMLElement> => {
  const [expanded, toggleExpanded] = useState(false);
  const onClick = (): void => toggleExpanded(!expanded);

  const alertUrl = alert.url ? alert.url : "";

  // remove [http:// | https:// | www.] from alert URL:
  let strippedAlertUrl = alertUrl.replace(/(https?:\/\/)?(www\.)?/i, "");

  // capitalize 'mbta' (special case):
  strippedAlertUrl = strippedAlertUrl.replace(/mbta/gi, "MBTA");

  const headerContent = alert.url
    ? `${alert.header}<span>&nbsp;</span><a href="${alert.url}" target="_blank">${strippedAlertUrl}</a>`
    : alert.header;

  return (
    <li
      id={`alert-${alert.id}`}
      tabIndex={0}
      className={alertClassNames(alert, expanded)}
      onClick={onClick}
      onKeyPress={e => handleReactEnterKeyPress(e, onClick)}
      aria-expanded={expanded}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role="button"
    >
      <div className="c-alert-item__icon">{iconForAlert(alert)}</div>
      <div className="c-alert-item__top">
        <div className="c-alert-item__top-text-container">
          <div className="c-alert-item__effect">
            {`${effectNameForAlert(alert)} `}
            {humanLabelForAlert(alert) ? alertLabel(alert) : null}
          </div>
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: headerContent }} />
        </div>
        <div className="c-alert-item__top-caret-container">
          {caretIcon(alert.description === "", expanded)}
        </div>
      </div>
      {expanded && alert.description ? alertDescription(alert) : null}
      {/* No javascript support */}
      {alert.description ? (
        <noscript>{alertDescription(alert)}</noscript>
      ) : null}
    </li>
  );
};

const Alerts = ({ alerts }: Props): ReactElement<HTMLElement> => (
  <div className="container">
    <div className="page-section">
      <ul className="c-alert-group">
        {alerts.map((alert: AlertType) => (
          <Alert key={alert.id} alert={alert} />
        ))}
      </ul>
    </div>
  </div>
);

export default Alerts;
