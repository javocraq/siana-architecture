import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import NewsletterCta from "./NewsletterCta";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-ink">
      <Navbar />
      <main className="flex-1">{children}</main>
      <NewsletterCta />
      <Footer />
    </div>
  );
}
