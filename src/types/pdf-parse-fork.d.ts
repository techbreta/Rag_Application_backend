// Type declarations for pdf-parse-fork module
declare module "pdf-parse-fork" {
  interface PDFData {
    text: string;
    numpages?: number;
    info?: any;
    metadata?: any;
    version?: string;
  }

  function parse(buffer: Buffer, options?: any): Promise<PDFData>;
  export = parse;
}
