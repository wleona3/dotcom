import React, { ReactElement } from "react";
import { SimpleProject as Project } from "./__projects";
import formattedDate from "../../helpers/date";
import RoutePillList from "./RoutePillList";

interface Props {
  projectUpdates: Project[];
  placeholderImageUrl: string;
}

const ProjectUpdateList = ({
  projectUpdates,
  placeholderImageUrl
}: Props): ReactElement<HTMLElement> | null =>
  projectUpdates.length > 0 ? (
    <>
      <h2 className="c-projects-header__subheader">Project Updates</h2>
      <div className="c-project-update-list__row">
        {projectUpdates.map(
          ({ image, path, title, routes, date, id }: Project) => (
            <a href={path} className="c-project-update-list__item" key={id}>
              <div>
                {image ? (
                  <img
                    className="c-project-update__photo"
                    src={image.url}
                    alt={image.alt}
                  />
                ) : (
                  <img
                    className="c-project-update__photo"
                    src={placeholderImageUrl}
                    alt="MBTA logo"
                  />
                )}
              </div>
              <div className="c-project-update__date u-small-caps">
                {formattedDate(date)}
              </div>
              <h3 className="c-project-update__title">{title}</h3>
              <RoutePillList routes={routes} />
            </a>
          )
        )}
      </div>
    </>
  ) : null;

export default ProjectUpdateList;