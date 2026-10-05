import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main
      id="main"
      className="page-width grid min-h-[calc(100svh-68px)] content-center gap-12 pt-12 split:grid-cols-[1.15fr_1fr] split:grid-rows-[1fr_auto] split:items-center split:gap-x-6 split:pt-16"
    >
      <div>
        <p className="folio-label">404 / Page not found</p>
        <h1 className="display-heading mt-7 text-[clamp(56px,9vw,108px)]">
          A little
          <br />
          out of place.
        </h1>
        <p className="section-intro mt-7">
          This page isn’t here.
          <br />
          There’s still plenty to explore.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 text-ui">
          <Link href="/" className="work-action">
            <span className="arrow-circle" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M20 12H4m6-6-6 6 6 6" />
              </svg>
            </span>
            Back home
          </Link>
          <Link href="/#work" className="muted-link">
            Explore the work
          </Link>
        </div>
      </div>
      <div className={styles.figure} aria-hidden="true">
        <span>4</span>
        <span className={styles.zero}>0</span>
        <span>4</span>
        <span className="folio-label absolute bottom-0 text-center tracking-wider">One wrong turn. No dead ends.</span>
      </div>
      <footer className="folio-label flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line py-5 split:col-span-full">
        <span>Hayyaun / Portfolio</span>
        <span>Clarity. Depth. Character.</span>
      </footer>
    </main>
  );
}
