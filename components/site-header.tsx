import Link from "next/link";
import DevToolsToggle from "./dev-tools-toggle";

export default function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header page-width">
        <Link href="/" className="wordmark" aria-label="Hayyaun home">
          Hayyaun
        </Link>
        <nav aria-label="Main navigation">
          {process.env.NODE_ENV === "development" && <DevToolsToggle />}
          <Link href="/#work">Work</Link>
          <Link href="/#about">About</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </header>
    </>
  );
}
