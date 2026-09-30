import { useEffect } from "react";
import { App } from "./App";
import { LandingPage } from "./landing/LandingPage";
import { PharmacyPage } from "./pharmacy/PharmacyPage";
import { APP_PATH, PHARMACY_PATH, usePathname } from "./router";

const TITLES = {
  app: "Counter session · MEDCLE",
  pharmacy: "Pharmacy requests · MEDCLE",
  landing: "MEDCLE · Clearer medication requests",
};

export function Root() {
  const pathname = usePathname();
  const page = pathname === APP_PATH ? "app" : pathname === PHARMACY_PATH ? "pharmacy" : "landing";

  useEffect(() => {
    document.title = TITLES[page];
  }, [page]);

  if (page === "app") return <App />;
  if (page === "pharmacy") return <PharmacyPage />;
  return <LandingPage />;
}
