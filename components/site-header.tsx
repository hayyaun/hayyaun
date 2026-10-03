import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header page-width">
      <Link href="/" className="brand-logo" aria-label="Hayyaun home">
        <Image src="/icon.svg" alt="" width={36} height={36} unoptimized />
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#work">Work</Link>
        <Link href="/#about">About</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/#contact">Contact</Link>
      </nav>
    </header>
  </>;
}
