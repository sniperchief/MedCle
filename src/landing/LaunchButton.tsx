import { ArrowRightIcon } from "../components/icons";
import { APP_PATH, Link } from "../router";

/** The call to action that opens the counter tool at /app. */
export function LaunchButton({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to={APP_PATH} className={`button ${inverse ? "button--inverse" : "button--primary"}`}>
      Launch MEDCLE
      <ArrowRightIcon />
    </Link>
  );
}
