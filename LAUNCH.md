# Launch Plan — pdf-toolkit-mcp

## Phase 1: Build & Test (Tag 1)

```bash
cd pdf-toolkit-mcp
npm install
npm run build              # Kompiliert TypeScript
npm run inspect            # Öffnet MCP Inspector — teste jedes Tool
```

Teste im Inspector:
- [ ] `pdf_info` mit einem echten PDF
- [ ] `pdf_merge` mit 2 PDFs
- [ ] `pdf_split` — splittet korrekt
- [ ] `pdf_rotate` — Rotation stimmt
- [ ] `pdf_add_watermark` — Text sichtbar
- [ ] `pdf_extract_text` — Text kommt raus
- [ ] `pdf_create` — generiert valides PDF

## Phase 2: Publish auf npm (Tag 1, nach Tests)

```bash
# npm Account erstellen falls noch keiner existiert
npm login

# In package.json deinen Namen + GitHub URL eintragen
# Dann publishen:
npm publish
```

Danach funktioniert sofort:
```
npx -y pdf-toolkit-mcp
```

## Phase 3: GitHub Repo (Tag 1)

```bash
gh repo create pdf-toolkit-mcp --public --source=. --remote=origin
git init
git add .
git commit -m "feat: initial release — 11 PDF tools via MCP"
git push -u origin main
```

GitHub-Repo optimieren:
- [ ] Description: "MCP server for PDF manipulation — merge, split, rotate, watermark, extract. Zero API keys."
- [ ] Topics: `mcp`, `mcp-server`, `pdf`, `claude`, `cursor`, `ai`, `developer-tools`
- [ ] Website: npm package URL

## Phase 4: Distribution (Tag 2-3)

### MCP-Verzeichnisse (kostenlos, bringt organische User)
- [ ] https://mcpmarket.com — Submit
- [ ] https://mcp.developersdigest.tech — Submit
- [ ] https://mcpize.com — Publish (optional: Monetarisierung)
- [ ] https://glama.ai/mcp/servers — Submit
- [ ] https://smithery.ai — Submit

### Reddit (Tag 3)
- [ ] r/ClaudeAI — "I built an open-source MCP server for PDF manipulation"
- [ ] r/cursor — "PDF toolkit MCP server — merge, split, watermark from Cursor"
- [ ] r/LocalLLaMA — wenn relevant

### Hacker News (Tag 4-5)
- [ ] "Show HN: PDF Toolkit MCP — open-source PDF manipulation for AI agents"
- [ ] Post um 13:00 deutsche Zeit (8:00 EST)

### Dev.to / X (laufend)
- [ ] Artikel: "The PDF gap in the MCP ecosystem (and how I filled it)"
- [ ] Thread auf X mit GIF/Screenshots aus dem MCP Inspector

## Phase 5: Monetarisierung (optional, nach Traktion)

Wenn du Stars/Downloads hast, gibt es zwei Wege:

### Weg A: Pro-Features via Polar.sh
- OCR (Tesseract-Integration)
- PDF-Verschlüsselung
- Bulk-Processing
- Formularfelder ausfüllen
→ Kostenlos: die 11 Basis-Tools
→ Pro: 9€/Monat oder 79€ Lifetime

### Weg B: Hosted MCP Server auf MCPize
- Deploy als Hosted Server
- Pay-per-tool-call
- 85% Revenue Share
→ Null Kosten für dich, MCPize hostet

## Realistische Erwartungen

**Woche 1:** 10-50 npm Downloads/Tag, 50-200 GitHub Stars
**Monat 1:** 200-1000 Downloads/Tag (wenn MCP-Verzeichnisse greifen)
**Monat 3:** Stabile Nutzerbasis, Feedback für Pro-Features

Der Schlüssel: PDF-Manipulation ist ein **universelles** Problem.
Jeder Dev, jedes Team braucht es. Die Lücke ist real und dokumentiert.
