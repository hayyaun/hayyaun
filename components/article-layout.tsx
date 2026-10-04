import type { ReactNode } from "react";
import Link from "next/link";
import "@/app/styles/article.css";

export function ArticleLayout({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="page-width max-w-article pt-12 pb-20 tablet:pt-16">
      <Link href={backHref} className="text-link">
        {backLabel}
      </Link>
      {children}
    </main>
  );
}

export function ArticleHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="mt-9 mb-12 border-b border-line pb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-5 text-article wrap-break-word">{title}</h1>
      <p className="mt-6 max-w-185 text-deck text-subtle">{description}</p>
      {children}
    </header>
  );
}

export function RelatedLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mt-3 block text-related">
      {children} <span aria-hidden="true">↗</span>
    </Link>
  );
}
