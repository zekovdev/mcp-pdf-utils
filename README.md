<div align="center">

# mcp-pdf-utils

**MCP server for PDF manipulation. Merge, split, rotate, watermark, extract text, and more.**

Works with Claude Desktop, Cursor, VS Code, ChatGPT, and any MCP-compatible client.

[![npm](https://img.shields.io/npm/v/mcp-pdf-utils)](https://www.npmjs.com/package/mcp-pdf-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## Why

PDF manipulation is one of the most common developer tasks, yet there's no good MCP server for it. The existing options have 1 star. This one actually works.

Everything runs locally. No API keys. No cloud services. Your PDFs never leave your machine.

## Tools

| Tool | Description |
|------|-------------|
| `pdf_info` | Get metadata, page count, file size |
| `pdf_extract_text` | Extract text content from pages |
| `pdf_merge` | Combine multiple PDFs into one |
| `pdf_split` | Split PDF into individual page files |
| `pdf_extract_pages` | Extract a page range into a new PDF |
| `pdf_rotate` | Rotate pages by 90°, 180°, or 270° |
| `pdf_add_watermark` | Add text watermark (e.g. DRAFT, CONFIDENTIAL) |
| `pdf_delete_pages` | Remove specific pages |
| `pdf_reorder` | Rearrange page order |
| `pdf_set_metadata` | Set title, author, subject, keywords |
| `pdf_create` | Create a new PDF from plain text |

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pdf-tools": {
      "command": "npx",
      "args": ["-y", "mcp-pdf-utils"]
    }
  }
}
```

That's it. Restart Claude Desktop and start asking it to work with PDFs.

### Claude Code

```bash
claude mcp add pdf-tools -- npx -y mcp-pdf-utils
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "pdf-tools": {
      "command": "npx",
      "args": ["-y", "mcp-pdf-utils"]
    }
  }
}
```

### VS Code

Add to your VS Code MCP config:

```json
{
  "mcp": {
    "servers": {
      "pdf-tools": {
        "command": "npx",
        "args": ["-y", "mcp-pdf-utils"]
      }
    }
  }
}
```

## Usage Examples

Once connected, just talk to your AI naturally:

- *"Merge invoice_jan.pdf and invoice_feb.pdf into combined.pdf"*
- *"Extract pages 3-7 from report.pdf"*
- *"Add a CONFIDENTIAL watermark to contract.pdf"*
- *"How many pages does presentation.pdf have?"*
- *"Rotate all pages in scan.pdf by 90 degrees"*
- *"Remove page 5 from my document"*
- *"Extract all the text from this PDF"*
- *"Reorder the pages: put page 3 first, then 1, then 2"*

## Development

```bash
git clone https://github.com/zekovdev/mcp-pdf-utils.git
cd mcp-pdf-utils
npm install
npm run dev
```

### Test with MCP Inspector

```bash
npm run inspect
```

This opens the official MCP Inspector where you can test every tool visually.

## How It Works

The server uses [`pdf-lib`](https://github.com/Hopding/pdf-lib) for PDF manipulation and [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) for text extraction. Both run locally with zero external dependencies — no API keys, no network calls, no cloud services.

Communication uses the MCP stdio transport, meaning the server runs as a local process that your AI client spawns and talks to via stdin/stdout.

## Roadmap

- [ ] PDF compression (reduce file size)
- [ ] Image extraction from PDFs
- [ ] PDF to images (page thumbnails)
- [ ] Add page numbers
- [ ] PDF encryption / password protection
- [ ] Fill PDF form fields
- [ ] OCR for scanned PDFs (via Tesseract)
- [ ] Image to PDF conversion

## Contributing

PRs welcome. Run `npm run inspect` to test your changes before submitting.

## License

MIT