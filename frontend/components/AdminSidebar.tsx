"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

/** Fixed order — matches the public nav order (constraint C8). */
const SECTIONS = [
  { href: "/admin/intro", label: "Intro" },
  { href: "/admin/built", label: "Built" },
  { href: "/admin/how-i-got-here", label: "How I Got Here" },
  { href: "/admin/toolbox", label: "Toolbox" },
  { href: "/admin/log", label: "Log" },
  { href: "/admin/lets-talk", label: "Let's Talk" },
] as const;

export function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar} aria-label="Admin sections">
      <p className={styles.kicker}>Admin</p>
      <ul className={styles.list}>
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={[styles.link, active ? styles.active : ""].filter(Boolean).join(" ")}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.logout} onClick={onLogout}>
        Log out
      </button>
    </nav>
  );
}
