import { describe, expect, it } from "vitest";
import { escapeHtml, formatContactEmail } from "./contactEmail";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe(
      "&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;",
    );
  });
});

describe("formatContactEmail", () => {
  it("escapes the visitor's name/email/message in the HTML part", () => {
    const out = formatContactEmail({
      name: "Ann <b>",
      email: "a@x.com",
      message: "hi <img src=x> & bye",
    });
    expect(out.html).not.toContain("<b>");
    expect(out.html).not.toContain("<img");
    expect(out.html).toContain("&lt;b&gt;");
    expect(out.html).toContain("&amp; bye");
  });

  it("converts newlines to <br> in the HTML body", () => {
    const out = formatContactEmail({ name: "A", email: "a@x.com", message: "line1\nline2" });
    expect(out.html).toContain("line1<br>line2");
    expect(out.text).toContain("line1\nline2");
  });

  it("collapses newlines in the subject and caps its length", () => {
    const out = formatContactEmail({
      name: "bad\r\nSubject: injected",
      email: "a@x.com",
      message: "x",
    });
    expect(out.subject).not.toMatch(/[\r\n]/);
    expect(out.subject.length).toBeLessThanOrEqual(200);
  });
});
