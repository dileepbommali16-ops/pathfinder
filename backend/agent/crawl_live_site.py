"""
Pathfinder DAS Agent: Live Website Crawler via Firecrawl
Usage:
  From backend/: python -m agent.crawl_live_site [target_url]
  From repo root: python -m backend.agent.crawl_live_site [target_url]

Scrapes the deployed website using Firecrawl, extracts clean markdown & metadata,
and updates the agent's knowledge base so DAS AI has real live ground truth.
"""

import os
import sys
import pathlib
from dotenv import load_dotenv

# Locate and load .env from backend/ or root
for env_path in [pathlib.Path(".env"), pathlib.Path("backend/.env"), pathlib.Path("../backend/.env")]:
    if env_path.exists():
        load_dotenv(env_path)
        break

api_key = os.getenv("FIRECRAWL_API_KEY")
if not api_key:
    print("ERROR: FIRECRAWL_API_KEY is not set in environment or backend/.env")
    sys.exit(1)

target_url = sys.argv[1] if len(sys.argv) > 1 else "https://pathfinder-client-fzom.vercel.app"
print(f"[*] Crawling live site with Firecrawl: {target_url} ...")

try:
    from firecrawl import FirecrawlApp
    app = FirecrawlApp(api_key=api_key)
    
    # Scrape the target URL using Firecrawl
    try:
        scrape_result = app.scrape(target_url, formats=["markdown"])
    except Exception:
        scrape_result = app.scrape_url(target_url, params={"formats": ["markdown"]})
    
    # Extract markdown content from Document or dict
    markdown_content = ""
    title = "Pathfinder 2.0"
    
    if hasattr(scrape_result, "markdown"):
        markdown_content = scrape_result.markdown or ""
        metadata = getattr(scrape_result, "metadata", {})
        if isinstance(metadata, dict):
            title = metadata.get("title", title)
    elif isinstance(scrape_result, dict):
        markdown_content = scrape_result.get("markdown", "")
        title = scrape_result.get("metadata", {}).get("title", title)

    print(f"[+] Successfully scraped {len(markdown_content)} characters of live site content.")
    
    # Save raw scrape
    base_dir = pathlib.Path(__file__).parent
    scraped_file = base_dir / "live_site_scraped.md"
    scraped_file.write_text(markdown_content, encoding="utf-8")
    print(f"[+] Saved live markdown to: {scraped_file}")
    
    # Update site_notes.md with the live scraped snapshot
    site_notes_file = base_dir / "site_notes.md"
    live_section = f"\n\n## Live Deployed Site Content ({target_url})\n{markdown_content[:6000]}\n"
    
    if site_notes_file.exists():
        current_notes = site_notes_file.read_text(encoding="utf-8")
        if "## Live Deployed Site Content" in current_notes:
            parts = current_notes.split("## Live Deployed Site Content")
            current_notes = parts[0]
        site_notes_file.write_text(current_notes.strip() + live_section, encoding="utf-8")
    else:
        site_notes_file.write_text(live_section, encoding="utf-8")
        
    print(f"[+] Updated site_notes.md with live site knowledge!")
    print(f"[OK] DAS AI Agent is now fully aware of the live website at {target_url}")

except Exception as e:
    print(f"[!] Error during live site crawl: {e}")
    sys.exit(1)
