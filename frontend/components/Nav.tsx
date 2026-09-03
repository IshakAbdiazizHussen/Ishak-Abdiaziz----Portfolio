"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { site } from "@/content/site";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/", label: "Intro" },
  { href: "/built", label: "Built" },
  { href: "/how-i-got-here", label: "How I Got Here" },
  { href: "/toolbox", label: "Toolbox" },
  { href: "/log", label: "Log" },
  { href: "/lets-talk", label: "Let's Talk" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const innerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // Static — tracks only the current page's link, not hover/focus. Moves only
  // when `pathname` changes (i.e. a menu item was clicked). Pinned to the
  // bottom edge of the nav bar (see the CSS); position/width measured against
  // the bar itself so it lines up under the active link.
  useEffect(() => {
    const indicator = indicatorRef.current;
    const inner = innerRef.current;
    if (!indicator || !inner) return;

    function place() {
      const target = itemRefs.current.get(pathname);
      if (!indicator || !inner) return;
      if (!target) {
        indicator.style.opacity = "0";
        return;
      }
      const t = target.getBoundingClientRect();
      const i = inner.getBoundingClientRect();
      indicator.style.opacity = "1";
      indicator.style.width = `${t.width}px`;
      indicator.style.transform = `translateX(${t.left - i.left}px)`;
    }

    place();
    // Link widths can shift on resize (wrapping breakpoint, font load).
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname]);

  return (
    <header className={styles.bar}>
      <div className={styles.inner} ref={innerRef}>
        <Link href="/" className={styles.brand} aria-label="Home">
          <span className={styles.mark} aria-hidden="true">
            <span className={styles.markDot} />
            <span className={styles.markStem} />
          </span>
        </Link>

        <nav
          id="primary-nav"
          aria-label="Primary"
          className={[styles.links, open ? styles.linksOpen : ""].filter(Boolean).join(" ")}
        >
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  if (el) itemRefs.current.set(link.href, el);
                  else itemRefs.current.delete(link.href);
                }}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={[styles.link, active ? styles.active : ""].filter(Boolean).join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>

          <ThemeToggle />

          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconLink}
            aria-label="GitHub"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>

          <a
            href={site.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconLink}
            aria-label="LinkedIn"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M13.63 13.63h-2.37V9.9c0-.89-.02-2.03-1.24-2.03-1.24 0-1.43.97-1.43 1.97v3.79H6.22V6h2.28v1.04h.03c.32-.6 1.09-1.24 2.25-1.24 2.4 0 2.85 1.58 2.85 3.64v4.19zM3.55 4.96a1.38 1.38 0 1 1 0-2.76 1.38 1.38 0 0 1 0 2.76zM4.74 13.63H2.36V6h2.38v7.63zM14.82 0H1.18C.53 0 0 .52 0 1.16v13.68C0 15.48.53 16 1.18 16h13.64c.65 0 1.18-.52 1.18-1.16V1.16C16 .52 15.47 0 14.82 0z" />
            </svg>
          </a>
        </div>

        {/* Pinned to the bottom edge of the nav bar; position/width set in JS. */}
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      </div>
    </header>
  );
}
