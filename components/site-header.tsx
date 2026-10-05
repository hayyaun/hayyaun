import Link from "next/link";

export default function SiteHeader() {
  return (
    <>
      <a className="fixed top-3 left-3 z-10 translate-y-[-150%] bg-white px-4.5 py-3 focus:translate-y-0" href="#main">
        Skip to content
      </a>
      <header className="site-header page-width flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3 tablet:py-6">
        <Link href="/" className="wordmark" aria-label="Hayyaun home">
          Hayyaun
        </Link>
        <nav
          className="flex gap-5.5 text-small [&_a]:flex [&_a]:min-h-11 [&_a]:items-center"
          aria-label="Main navigation"
        >
          <Link href="/#work">Work</Link>
          <Link href="/#about">About</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </header>
    </>
  );
}
