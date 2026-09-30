import { useState } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { TopBar } from "../components/TopBar";
import { pharmacyRequests, usePharmacyRequests } from "../requests/usePharmacyRequests";
import { APP_PATH, Link } from "../router";
import { RequestDetail } from "./RequestDetail";
import { RequestQueue } from "./RequestQueue";

/**
 * The pharmacist's view at /pharmacy: the requests customers confirmed at the
 * counter, to open, compare with what was said, and move through review. It
 * receives requests only; every pharmacy decision stays with the pharmacist.
 */
export function PharmacyPage() {
  const requests = usePharmacyRequests();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = requests.find((request) => request.id === openId);

  return (
    <>
      <TopBar
        actions={
          <Link to={APP_PATH} className="topbar__link">
            Counter session
          </Link>
        }
      />

      <main className="page">
        <header className="session">
          <p className="eyebrow">Pharmacy</p>
          <h1 className="session__title">Pharmacy requests</h1>
          <p className="session__intro">
            Requests customers confirmed at the counter. Open one to compare the request with what
            the customer actually said. Requests are kept in this browser only.
          </p>
        </header>

        {open ? (
          <RequestDetail
            request={open}
            onBack={() => setOpenId(null)}
            onStatusChange={(status) => pharmacyRequests.setStatus(open.id, status)}
          />
        ) : (
          <RequestQueue requests={requests} onOpen={setOpenId} />
        )}
      </main>

      <SiteFooter />
    </>
  );
}
