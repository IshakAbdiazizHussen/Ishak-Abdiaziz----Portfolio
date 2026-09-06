import { AppError } from "./errors";

/**
 * First-page PNG preview for an uploaded Log PDF. Rendered once at upload time
 * and stored beside the PDF (`<id>.pdf` + `<id>.png`), so the public Log shows
 * an actual page image instead of a generic file icon.
 *
 * `pdf-to-img` is ESM-only and this backend compiles to CommonJS, so a normal
 * `await import()` would be down-levelled to `require()` and fail. `importEsm`
 * hides the import from the compiler and runs it as a real dynamic import.
 */
interface PdfDocument {
  getPage(pageNumber: number): Promise<Buffer>;
}
type PdfRenderer = (
  src: Buffer,
  options?: { scale?: number; docInitParams?: { verbosity?: number } },
) => Promise<PdfDocument>;

const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<{ pdf: PdfRenderer }>;

// Rendered wider than the card slot so it stays crisp on retina / when enlarged.
const RENDER_SCALE = 1.75;

export async function renderPdfFirstPage(pdfBytes: Buffer): Promise<Buffer> {
  let pdf: PdfRenderer;
  try {
    ({ pdf } = await importEsm("pdf-to-img"));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    throw new AppError(503, `PDF preview rendering is unavailable (${detail}).`, true);
  }

  try {
    // verbosity: 0 keeps pdf.js's "Indexing all PDF objects" warnings out of the logs.
    const doc = await pdf(pdfBytes, { scale: RENDER_SCALE, docInitParams: { verbosity: 0 } });
    return await doc.getPage(1);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "could not read the file";
    throw new AppError(422, `Could not render the PDF (${detail}). Is it a valid PDF?`, true);
  }
}
