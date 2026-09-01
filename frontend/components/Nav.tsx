"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/", label: "Intro" },
  { href: "/built", label: "Built" },
  { href: "/how-i-got-here", label: "How I Got Here" },
  { href: "/toolbox", label: "Toolbox" },
  { href: "/log", label: "Log" },
  { href: "/lets-talk", label: "Let's Talk" },
] as const;

function SunIcon() {
  return (
    <svg
      className={styles.sun}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
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
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={[styles.link, active ? styles.active : ""].filter(Boolean).join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* TODO: wire to a real light-mode toggle. Look-only for now. */}
          <button type="button" className={styles.theme} aria-label="Toggle colour theme">
            <SunIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
