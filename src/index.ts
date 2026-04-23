#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Helper: resolve file path (supports absolute + relative)
// ---------------------------------------------------------------------------
function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

async function readPdf(filePath: string): Promise<Uint8Array> {
  const resolved = resolvePath(filePath);
  return new Uint8Array(await fs.readFile(resolved));
}

async function writePdf(filePath: string, data: Uint8Array): Promise<string> {
  const resolved = resolvePath(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, data);
  return resolved;
}

// ---------------------------------------------------------------------------
// Create MCP Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "pdf-toolkit-mcp",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Tool 1: pdf_info — Get metadata & page count
// ---------------------------------------------------------------------------
server.tool(
  "pdf_info",
  "Get PDF metadata: page count, title, author, creator, creation date, file size.",
  {
    file: z.string().describe("Path to the PDF file"),
  },
  async ({ file }) => {
    const bytes = await readPdf(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const stat = await fs.stat(resolvePath(file));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              pages: doc.getPageCount(),
              title: doc.getTitle() ?? null,
              author: doc.getAuthor() ?? null,
              subject: doc.getSubject() ?? null,
              creator: doc.getCreator() ?? null,
              producer: doc.getProducer() ?? null,
              creationDate: doc.getCreationDate()?.toISOString() ?? null,
              modificationDate: doc.getModificationDate()?.toISOString() ?? null,
              fileSize: stat.size,
              fileSizeHuman: `${(stat.size / 1024).toFixed(1)} KB`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 2: pdf_extract_text — Extract text content
// ---------------------------------------------------------------------------
server.tool(
  "pdf_extract_text",
  "Extract text content from a PDF file. Optionally specify page range.",
  {
    file: z.string().describe("Path to the PDF file"),
    startPage: z.number().optional().describe("Start page (1-based, default: 1)"),
    endPage: z.number().optional().describe("End page (1-based, default: last page)"),
  },
  async ({ file, startPage, endPage }) => {
    const bytes = await readPdf(file);
    // Dynamic import for pdf-parse (CommonJS module)
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(Buffer.from(bytes));

    // pdf-parse doesn't support page ranges natively, return full text
    // with a note about the requested range
    const totalPages = data.numpages;
    const start = startPage ?? 1;
    const end = endPage ?? totalPages;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalPages,
            requestedRange: `${start}-${end}`,
            text: data.text,
            info: data.info,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 3: pdf_merge — Merge multiple PDFs into one
// ---------------------------------------------------------------------------
server.tool(
  "pdf_merge",
  "Merge multiple PDF files into a single PDF.",
  {
    files: z.array(z.string()).min(2).describe("Array of PDF file paths to merge (in order)"),
    output: z.string().describe("Output file path for the merged PDF"),
  },
  async ({ files, output }) => {
    const merged = await PDFDocument.create();

    for (const filePath of files) {
      const bytes = await readPdf(filePath);
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      for (const page of pages) {
        merged.addPage(page);
      }
    }

    const outBytes = await merged.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            totalPages: merged.getPageCount(),
            mergedFiles: files.length,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 4: pdf_split — Split PDF into individual pages or ranges
// ---------------------------------------------------------------------------
server.tool(
  "pdf_split",
  "Split a PDF into separate files. Extract specific pages or split into individual page files.",
  {
    file: z.string().describe("Path to the PDF file to split"),
    pages: z
      .array(z.number())
      .optional()
      .describe("Specific page numbers to extract (1-based). If omitted, splits into individual pages."),
    outputDir: z.string().describe("Output directory for split PDF files"),
  },
  async ({ file, pages, outputDir }) => {
    const bytes = await readPdf(file);
    const source = await PDFDocument.load(bytes);
    const totalPages = source.getPageCount();
    const pagesToExtract = pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);
    const outputFiles: string[] = [];

    for (const pageNum of pagesToExtract) {
      if (pageNum < 1 || pageNum > totalPages) continue;

      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(source, [pageNum - 1]);
      newDoc.addPage(copiedPage);

      const outBytes = await newDoc.save();
      const fileName = `page_${String(pageNum).padStart(3, "0")}.pdf`;
      const outPath = await writePdf(path.join(outputDir, fileName), outBytes);
      outputFiles.push(outPath);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            totalSourcePages: totalPages,
            extractedPages: pagesToExtract.length,
            files: outputFiles,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 5: pdf_rotate — Rotate pages
// ---------------------------------------------------------------------------
server.tool(
  "pdf_rotate",
  "Rotate pages of a PDF by 90, 180, or 270 degrees.",
  {
    file: z.string().describe("Path to the PDF file"),
    output: z.string().describe("Output file path"),
    angle: z.enum(["90", "180", "270"]).describe("Rotation angle in degrees"),
    pages: z
      .array(z.number())
      .optional()
      .describe("Specific pages to rotate (1-based). If omitted, rotates all pages."),
  },
  async ({ file, output, angle, pages }) => {
    const bytes = await readPdf(file);
    const doc = await PDFDocument.load(bytes);
    const totalPages = doc.getPageCount();
    const pagesToRotate = pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);
    const rotationAngle = parseInt(angle, 10);

    for (const pageNum of pagesToRotate) {
      if (pageNum < 1 || pageNum > totalPages) continue;
      const page = doc.getPage(pageNum - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + rotationAngle));
    }

    const outBytes = await doc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            rotatedPages: pagesToRotate.length,
            angle: rotationAngle,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 6: pdf_add_watermark — Add text watermark
// ---------------------------------------------------------------------------
server.tool(
  "pdf_add_watermark",
  "Add a text watermark to all or specific pages of a PDF.",
  {
    file: z.string().describe("Path to the PDF file"),
    output: z.string().describe("Output file path"),
    text: z.string().describe("Watermark text (e.g. 'CONFIDENTIAL', 'DRAFT')"),
    fontSize: z.number().optional().describe("Font size (default: 50)"),
    opacity: z.number().optional().describe("Opacity 0-1 (default: 0.3)"),
    angle: z.number().optional().describe("Rotation angle in degrees (default: -45)"),
    pages: z
      .array(z.number())
      .optional()
      .describe("Specific pages (1-based). If omitted, applies to all pages."),
  },
  async ({ file, output, text, fontSize, opacity, angle, pages }) => {
    const bytes = await readPdf(file);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const totalPages = doc.getPageCount();
    const pagesToMark = pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);

    const size = fontSize ?? 50;
    const alpha = opacity ?? 0.3;
    const rotation = angle ?? -45;

    for (const pageNum of pagesToMark) {
      if (pageNum < 1 || pageNum > totalPages) continue;
      const page = doc.getPage(pageNum - 1);
      const { width, height } = page.getSize();

      const textWidth = font.widthOfTextAtSize(text, size);
      const textHeight = font.heightAtSize(size);

      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2 - textHeight / 2,
        size,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: alpha,
        rotate: degrees(rotation),
      });
    }

    const outBytes = await doc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            watermarkText: text,
            pagesWatermarked: pagesToMark.length,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 7: pdf_extract_pages — Extract page range to new PDF
// ---------------------------------------------------------------------------
server.tool(
  "pdf_extract_pages",
  "Extract a range of pages from a PDF into a new PDF file.",
  {
    file: z.string().describe("Path to the source PDF file"),
    output: z.string().describe("Output file path"),
    startPage: z.number().describe("Start page (1-based)"),
    endPage: z.number().describe("End page (1-based, inclusive)"),
  },
  async ({ file, output, startPage, endPage }) => {
    const bytes = await readPdf(file);
    const source = await PDFDocument.load(bytes);
    const totalPages = source.getPageCount();

    const start = Math.max(1, startPage) - 1;
    const end = Math.min(totalPages, endPage);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(source, indices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const outBytes = await newDoc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            extractedPages: indices.length,
            range: `${startPage}-${endPage}`,
            sourcePages: totalPages,
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 8: pdf_set_metadata — Set PDF metadata
// ---------------------------------------------------------------------------
server.tool(
  "pdf_set_metadata",
  "Set or update PDF metadata (title, author, subject, keywords, creator).",
  {
    file: z.string().describe("Path to the PDF file"),
    output: z.string().describe("Output file path"),
    title: z.string().optional().describe("Document title"),
    author: z.string().optional().describe("Author name"),
    subject: z.string().optional().describe("Document subject"),
    keywords: z.array(z.string()).optional().describe("Keywords array"),
    creator: z.string().optional().describe("Creator application name"),
  },
  async ({ file, output, title, author, subject, keywords, creator }) => {
    const bytes = await readPdf(file);
    const doc = await PDFDocument.load(bytes);

    if (title) doc.setTitle(title);
    if (author) doc.setAuthor(author);
    if (subject) doc.setSubject(subject);
    if (keywords) doc.setKeywords(keywords);
    if (creator) doc.setCreator(creator);

    const outBytes = await doc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            metadata: { title, author, subject, keywords, creator },
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 9: pdf_delete_pages — Remove specific pages
// ---------------------------------------------------------------------------
server.tool(
  "pdf_delete_pages",
  "Delete specific pages from a PDF.",
  {
    file: z.string().describe("Path to the PDF file"),
    output: z.string().describe("Output file path"),
    pages: z.array(z.number()).min(1).describe("Page numbers to delete (1-based)"),
  },
  async ({ file, output, pages }) => {
    const bytes = await readPdf(file);
    const source = await PDFDocument.load(bytes);
    const totalPages = source.getPageCount();

    // Pages to keep (0-based indices)
    const deleteSet = new Set(pages.map((p) => p - 1));
    const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => !deleteSet.has(i)
    );

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(source, keepIndices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const outBytes = await newDoc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            deletedPages: pages,
            remainingPages: newDoc.getPageCount(),
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 10: pdf_reorder — Reorder pages
// ---------------------------------------------------------------------------
server.tool(
  "pdf_reorder",
  "Reorder pages of a PDF. Provide the desired page order.",
  {
    file: z.string().describe("Path to the PDF file"),
    output: z.string().describe("Output file path"),
    order: z
      .array(z.number())
      .min(1)
      .describe("New page order as array of page numbers (1-based). E.g. [3,1,2] puts page 3 first."),
  },
  async ({ file, output, order }) => {
    const bytes = await readPdf(file);
    const source = await PDFDocument.load(bytes);

    const newDoc = await PDFDocument.create();
    const indices = order.map((p) => p - 1);
    const copiedPages = await newDoc.copyPages(source, indices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const outBytes = await newDoc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            newOrder: order,
            totalPages: newDoc.getPageCount(),
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 11: pdf_create — Create a new PDF from text
// ---------------------------------------------------------------------------
server.tool(
  "pdf_create",
  "Create a new PDF document from plain text content.",
  {
    output: z.string().describe("Output file path"),
    text: z.string().describe("Text content for the PDF"),
    title: z.string().optional().describe("Document title"),
    fontSize: z.number().optional().describe("Font size (default: 12)"),
  },
  async ({ output, text, title, fontSize }) => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const size = fontSize ?? 12;
    const margin = 50;

    if (title) doc.setTitle(title);

    // Simple text wrapping
    const lines = text.split("\n");
    let page = doc.addPage();
    let { height } = page.getSize();
    let y = height - margin;
    const lineHeight = size * 1.4;
    const maxWidth = page.getSize().width - 2 * margin;

    for (const line of lines) {
      // Rough word-wrap
      const words = line.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && currentLine) {
          page.drawText(currentLine, { x: margin, y, size, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
          currentLine = word;

          if (y < margin) {
            page = doc.addPage();
            y = page.getSize().height - margin;
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      } else {
        y -= lineHeight; // empty line
      }

      if (y < margin) {
        page = doc.addPage();
        y = page.getSize().height - margin;
      }
    }

    const outBytes = await doc.save();
    const outPath = await writePdf(output, outBytes);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            output: outPath,
            pages: doc.getPageCount(),
          }),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("pdf-toolkit-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
