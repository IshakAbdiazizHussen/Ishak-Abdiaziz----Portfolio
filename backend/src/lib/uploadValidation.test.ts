import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  MAX_LOG_UPLOAD_BYTES,
  sniffImage,
  sniffPdf,
  validateImage,
  validateLogUpload,
} from "./uploadValidation";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "latin1"),
]);
const TEXT = Buffer.from("this is not an image at all", "utf8");
const PDF = Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "latin1");

describe("sniffImage", () => {
  it("identifies jpeg/png/webp by magic bytes", () => {
    expect(sniffImage(JPEG)).toEqual({ type: "image/jpeg", ext: "jpg" });
    expect(sniffImage(PNG)).toEqual({ type: "image/png", ext: "png" });
    expect(sniffImage(WEBP)).toEqual({ type: "image/webp", ext: "webp" });
  });

  it("returns null for non-images", () => {
    expect(sniffImage(TEXT)).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
});

describe("validateImage", () => {
  it("accepts a well-formed jpeg", () => {
    const r = validateImage({ buffer: JPEG, size: JPEG.length, mimetype: "image/jpeg" });
    expect(r).toEqual({ ok: true, ext: "jpg", contentType: "image/jpeg" });
  });

  it("rejects a text file renamed to .png (mismatched magic bytes)", () => {
    const r = validateImage({ buffer: TEXT, size: TEXT.length, mimetype: "image/png" });
    expect(r.ok).toBe(false);
  });

  it("rejects a real image whose declared type is wrong", () => {
    const r = validateImage({ buffer: PNG, size: PNG.length, mimetype: "image/jpeg" });
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects a disallowed mime type", () => {
    const gif = Buffer.from("GIF89a", "latin1");
    const r = validateImage({ buffer: gif, size: gif.length, mimetype: "image/gif" });
    expect(r.ok).toBe(false);
  });

  it("rejects oversize files", () => {
    const r = validateImage({
      buffer: JPEG,
      size: MAX_IMAGE_BYTES + 1,
      mimetype: "image/jpeg",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty files", () => {
    const r = validateImage({ buffer: Buffer.alloc(0), size: 0, mimetype: "image/png" });
    expect(r.ok).toBe(false);
  });

  it("rejects a PDF (images only)", () => {
    const r = validateImage({ buffer: PDF, size: PDF.length, mimetype: "application/pdf" });
    expect(r.ok).toBe(false);
  });
});

describe("sniffPdf", () => {
  it("identifies a PDF by its %PDF- header", () => {
    expect(sniffPdf(PDF)).toEqual({ type: "application/pdf", ext: "pdf" });
  });

  it("returns null for non-PDFs", () => {
    expect(sniffPdf(JPEG)).toBeNull();
    expect(sniffPdf(TEXT)).toBeNull();
  });
});

describe("validateLogUpload", () => {
  it("accepts a well-formed jpeg", () => {
    const r = validateLogUpload({ buffer: JPEG, size: JPEG.length, mimetype: "image/jpeg" });
    expect(r).toEqual({ ok: true, ext: "jpg", contentType: "image/jpeg" });
  });

  it("accepts a well-formed PDF", () => {
    const r = validateLogUpload({ buffer: PDF, size: PDF.length, mimetype: "application/pdf" });
    expect(r).toEqual({ ok: true, ext: "pdf", contentType: "application/pdf" });
  });

  it("rejects a text file renamed to .pdf (mismatched magic bytes)", () => {
    const r = validateLogUpload({ buffer: TEXT, size: TEXT.length, mimetype: "application/pdf" });
    expect(r.ok).toBe(false);
  });

  it("rejects a PDF declared as an image", () => {
    const r = validateLogUpload({ buffer: PDF, size: PDF.length, mimetype: "image/png" });
    expect(r.ok).toBe(false);
  });

  it("rejects a disallowed mime type", () => {
    const gif = Buffer.from("GIF89a", "latin1");
    const r = validateLogUpload({ buffer: gif, size: gif.length, mimetype: "image/gif" });
    expect(r.ok).toBe(false);
  });

  it("rejects files over the 10 MB cap", () => {
    const r = validateLogUpload({
      buffer: PDF,
      size: MAX_LOG_UPLOAD_BYTES + 1,
      mimetype: "application/pdf",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts a file at exactly 5 MB + 1 byte that validateImage would reject", () => {
    // guards the wider cap: same bytes, different limit
    expect(validateImage({ buffer: JPEG, size: MAX_IMAGE_BYTES + 1, mimetype: "image/jpeg" }).ok).toBe(
      false,
    );
    expect(
      validateLogUpload({ buffer: JPEG, size: MAX_IMAGE_BYTES + 1, mimetype: "image/jpeg" }).ok,
    ).toBe(true);
  });
});
