import { APP_PATH, Link } from "../router";
import { Logo } from "./TopBar";

/** Site-wide footer for the landing page and the counter tool. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Logo height={28} />
          <p>Helping pharmacists and customers hear the same thing.</p>
        </div>

        <nav className="site-footer__links" aria-label="Footer">
          <p className="label">MEDCLE</p>
          <a href="/#problem">The problem</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#safety">What it doesn't do</a>
          <Link to={APP_PATH}>Launch MEDCLE</Link>
        </nav>

        <div className="site-footer__note">
          <p className="label">A communication aid</p>
          <p>
            MEDCLE repeats and compares what was said. It does not prescribe, diagnose or recommend
            medication, and the pharmacist verifies every request.
          </p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} MEDCLE</p>
        <p>
          MEDCLE doesn't store recordings or transcripts. Speech is sent to AssemblyAI and Anthropic
          to transcribe it and extract the request.
        </p>
      </div>
    </footer>
  );
}
