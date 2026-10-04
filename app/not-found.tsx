import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="page-width py-24">
      <p className="section-label">404</p>
      <h1 className="mt-4 text-4xl">Page not found.</h1>
      <p className="my-6">This address does not point to a page on the portfolio.</p>
      <Link href="/" className="underline underline-offset-4">
        Return to the homepage
      </Link>
    </main>
  );
}
