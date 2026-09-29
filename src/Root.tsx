import { useEffect } from "react";
import { App } from "./App";
import { LandingPage } from "./landing/LandingPage";
import { APP_PATH, usePathname } from "./router";

export function Root() {
  const isApp = usePathname() === APP_PATH;

  useEffect(() => {
    document.title = isApp ? "Counter session · MEDCLE" : "MEDCLE · Clearer medication requests";
  }, [isApp]);

  return isApp ? <App /> : <LandingPage />;
}
