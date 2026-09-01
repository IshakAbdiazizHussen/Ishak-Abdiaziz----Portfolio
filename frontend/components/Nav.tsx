"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
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
        <Link href="/" className={styles.brand} aria-label="eng.portfolio — home">
          <span className={styles.mark} aria-hidden="true" />
          eng.portfolio
        </Link>

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

          <ThemeToggle />
        </div>

        {/* Pinned to the bottom edge of the nav bar; position/width set in JS. */}
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      </div>
    </header>
  );
}
