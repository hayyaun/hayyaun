import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main" className={`page-width ${styles.page}`}>
      <div>
        <p className={styles.eyebrow}>404 / Page not found</p>
        <h1 className={styles.title}>
          A little
          <br />
          out of place.
        </h1>
        <p className={styles.description}>
          This page isn’t here.
          <br />
          There’s still plenty to explore.
        </p>
        <div className={styles.actions}>
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
        <span className={styles.caption}>One wrong turn. No dead ends.</span>
      </div>
      <footer className={styles.footer}>
        <span>Hayyaun / Portfolio</span>
        <span>Clarity. Depth. Character.</span>
      </footer>
    </main>
  );
}
