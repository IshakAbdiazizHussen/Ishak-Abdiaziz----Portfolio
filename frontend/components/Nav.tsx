"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={`${site.name} — home`}>
          <span className={styles.brandMark}>~/</span>
          {site.name.split(" ")[0]?.toLowerCase()}
        </Link>

        <button
          type="button"
          className={styles.toggle}
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
      </div>
    </header>
  );
}
