export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          letterSpacing: "0.02em",
          opacity: 0.55,
          margin: 0,
        }}
      >
        portfolio-frontend · scaffold
      </p>
      <h1 style={{ fontSize: 28, lineHeight: 1.3, marginTop: 12 }}>
        Pages are built in features 6&ndash;10.
      </h1>
      <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
        This service is presentation-only. It reaches the backend only through{" "}
        <code>lib/backend.ts</code>.
      </p>
    </main>
  );
}
