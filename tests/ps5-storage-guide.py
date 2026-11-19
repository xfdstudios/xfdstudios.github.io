from pathlib import Path
from html.parser import HTMLParser
import re
ROOT = Path(__file__).resolve().parents[1]
s = (ROOT / "articles/tech-gta-6-box-has-no-disc-212-gb-pre-load.html").read_text()
guide = (ROOT / "assets/ps5-storage-guide.html").read_text()
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a": self.links.append(dict(attrs))
p = Links(); p.feed(guide)
paid = [a for a in p.links if "tag=" in a.get("href", "")]
assert {a["href"] for a in paid} == {
    "https://www.amazon.com/dp/B0CSD65FTW/ref=nosim?tag=xfdstudios-20",
    "https://www.amazon.com/dp/B0C47ZX1WB/ref=nosim?tag=xfdstudios-20",
    "https://www.amazon.com/dp/B0BHJDY57J/ref=nosim?tag=xfdstudios-20"}
assert len(paid) == 3 and all("sponsored" in a["rel"].split() for a in paid)
assert guide.count('class="storage-card"') == 3
assert 'grid-template-columns:repeat(3,minmax(0,1fr))' in guide
assert '@media(max-width:900px)' in guide and 'grid-template-columns:1fr' in guide
assert 'min-height:48px' in guide and ':focus-visible' in guide
assert not re.search(r'<(?:img|script|iframe)\b', guide)
assert guide.count('As an Amazon Associate I earn from qualifying purchases.') == 1
assert 'WDBBYV0020BNC-WRSN' in guide and 'MZ-V9P2T0CW' in guide
assert 'not hands-on reviews' in guide and 'first-time formatting erases' in guide
assert s.index('How much space you really have') < s.index('id="storage-guide-title"') < s.index('<h2>When pre-load starts')
assert s.count('tag=xfdstudios-20') == 3
assert s.count('analytics-consent.js?v=1') == 1 and 'physical-culture' in s
print('PASS: exact paid URLs, disclosure, 3 cards, responsive CSS, focus/touch targets, no media/tracking, placement, existing GA/merch')

assert "TM8FFH002T0C128" in guide
assert all(x in guide for x in [">Good<", ">Great<", ">Best<", "Skip", "same advertised 2TB"])
assert "B0CGF9T5P2" not in guide and "Seagate" not in guide
