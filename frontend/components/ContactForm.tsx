"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { site } from "@/content/site";
import { sendContactMessage } from "@/lib/contact";
import { validateContact, type ContactErrors, type ContactValues } from "@/lib/contact-validation";
import styles from "./ContactForm.module.css";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: ContactValues = { name: "", email: "", message: "" };

export function ContactForm() {
  const uid = useId();
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [showMailto, setShowMailto] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);

  function update(name: keyof ContactValues) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.getElementById(`${uid}-${Object.keys(found)[0]}`);
      first?.focus();
      return;
    }

    setStatus("submitting");
    setStatusMessage("");
    setShowMailto(false);

    const result = await sendContactMessage({ ...values, honeypot });

    if (result.ok) {
      setStatus("success");
      setStatusMessage("Thanks — your message is on its way. I'll get back to you soon.");
      setValues(EMPTY);
    } else {
      setStatus("error");
      setStatusMessage(result.message);
      setShowMailto(result.kind === "server");
    }
    statusRef.current?.focus();
  }

  const describedBy = (name: keyof ContactValues) =>
    errors[name] ? `${uid}-${name}-error` : undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset} disabled={status === "submitting"}>
        <legend className={styles.legend}>Send a message</legend>

        <div className={styles.field}>
          <label htmlFor={`${uid}-name`}>Name</label>
          <input
            id={`${uid}-name`}
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={update("name")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
          />
          {errors.name ? (
            <p id={`${uid}-name-error`} className={styles.error}>
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-email`}>Email</label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={update("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
          />
          {errors.email ? (
            <p id={`${uid}-email-error`} className={styles.error}>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-message`}>Message</label>
          <textarea
            id={`${uid}-message`}
            name="message"
            rows={6}
            value={values.message}
            onChange={update("message")}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy("message")}
          />
          {errors.message ? (
            <p id={`${uid}-message-error`} className={styles.error}>
              {errors.message}
            </p>
          ) : null}
        </div>

        {/* Honeypot — hidden from people, tempting to bots. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`${uid}-company`}>Company</label>
          <input
            id={`${uid}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <button type="submit" className="button">
          {status === "submitting" ? "Sending…" : "Send message"}
        </button>
      </fieldset>

      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={[
          styles.status,
          status === "success" ? styles.statusOk : "",
          status === "error" ? styles.statusBad : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {statusMessage}
        {showMailto ? (
          <>
            {" "}
            You can email me directly at{" "}
            <a href={`mailto:${site.email}`} className="inline-link">
              {site.email}
            </a>
            .
          </>
        ) : null}
      </p>
    </form>
  );
}
