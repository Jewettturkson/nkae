declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult { text: string; numpages: number; info: unknown; }
  export default function pdfParse(buffer: Buffer): Promise<PDFParseResult>;
}
