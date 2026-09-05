"use client";

import { useEffect } from "react";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container>
      <PageHeader
        kicker="Error"
        title="Something went wrong"
        intro="An unexpected error occurred while rendering this page."
      />
      <button type="button" onClick={reset} className="button">
        Try again
      </button>
    </Container>
  );
}
