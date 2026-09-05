import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

/**
 * Public-site layout: the shared top navigation, main landmark and footer that
 * wrap every public page (Intro, Built, How I Got Here, Toolbox, Log, Let's
 * Talk). `(site)` is a route group, so it adds no URL segment — these routes
 * still live at `/`, `/built`, etc. Routes under `/admin` are outside this
 * group and never mount `<Nav>`.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" className="site-main">
        {children}
      </main>
      <Footer />
    </>
  );
}
