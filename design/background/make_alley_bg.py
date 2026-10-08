"""
Generates frontend/public/bg-alley.svg: a night back-alley garage scene in grey-pink,
inspired by mid-2000s street-racing garage menus (original artwork, no game assets).

The sign above the garage door is where the club logo goes (`LOGO_HREF`); until a logo
file exists it shows the PETROLHEADS wordmark.

Run: python3 design/background/make_alley_bg.py
"""
import base64
import os
import random

W, H = 390, 844  # phone portrait; the SVG is drawn with preserveAspectRatio="xMidYMid slice"
# Neon club emblem from design/logos (built by make_brand_assets.py). Embedded as a data URI:
# an SVG used as a CSS background image can't load external files.
LOGO_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "brand", "emblem-neon.png")
LOGO_HREF = None
if os.path.exists(LOGO_FILE):
    with open(LOGO_FILE, "rb") as f:
        LOGO_HREF = "data:image/png;base64," + base64.b64encode(f.read()).decode()

rnd = random.Random(42)
out = []
add = out.append

add(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">')
add("""<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#14141b"/><stop offset="0.45" stop-color="#2a2430"/><stop offset="1" stop-color="#3a2a34"/>
  </linearGradient>
  <radialGradient id="cityGlow" cx="0.5" cy="0.3" r="0.5">
    <stop offset="0" stop-color="#e6c9d6" stop-opacity="0.35"/><stop offset="1" stop-color="#e6c9d6" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="leftWall" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#16161a"/><stop offset="1" stop-color="#2b2a2f"/>
  </linearGradient>
  <linearGradient id="brick" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#4a2630"/><stop offset="0.5" stop-color="#6b3341"/><stop offset="1" stop-color="#3d1f27"/>
  </linearGradient>
  <pattern id="bricks" width="14" height="7" patternUnits="userSpaceOnUse">
    <path d="M0 0.5H14M0 4H14M7 0.5V4M0 4V7.5M14 4V7.5" stroke="#2a1218" stroke-width="0.7" stroke-opacity="0.55" fill="none"/>
  </pattern>
  <linearGradient id="door" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b98592"/><stop offset="1" stop-color="#7d4c59"/>
  </linearGradient>
  <pattern id="slats" width="10" height="6" patternUnits="userSpaceOnUse">
    <rect width="10" height="6" fill="none"/><path d="M0 5.5H10" stroke="#4d2a33" stroke-width="1" stroke-opacity="0.7"/>
  </pattern>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2c2a30"/><stop offset="1" stop-color="#121115"/>
  </linearGradient>
  <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff7aa0" stop-opacity="0.35"/><stop offset="1" stop-color="#ff7aa0" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#fff4e6" stop-opacity="0.9"/><stop offset="0.25" stop-color="#ffe2c8" stop-opacity="0.35"/><stop offset="1" stop-color="#ffe2c8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="fog" cx="0.2" cy="0.75" r="0.6">
    <stop offset="0" stop-color="#b9b3bd" stop-opacity="0.22"/><stop offset="1" stop-color="#b9b3bd" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/>
  </radialGradient>
  <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  <linearGradient id="signFace" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#d9cfe0"/><stop offset="0.5" stop-color="#7b6b86"/><stop offset="1" stop-color="#f2e9f6"/>
  </linearGradient>
</defs>""")

# Sky and distant city glow
add(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
add(f'<rect x="60" y="0" width="270" height="420" fill="url(#cityGlow)"/>')

# Distant skyline with lit windows
skyline = [(118, 120, 26), (142, 70, 30), (170, 150, 22), (190, 95, 34), (222, 135, 28), (248, 60, 22), (268, 160, 26)]
for x, top, w in skyline:
    add(f'<rect x="{x}" y="{top}" width="{w}" height="{380 - top}" fill="#1c1b23"/>')
    for wy in range(top + 8, 370, 9):
        for wx in range(x + 3, x + w - 3, 6):
            if rnd.random() < 0.28:
                c = rnd.choice(["#f3e6c8", "#f6c8d6", "#d8dcff"])
                add(f'<rect x="{wx}" y="{wy}" width="2.4" height="3.2" fill="{c}" opacity="{rnd.uniform(0.35, 0.9):.2f}"/>')
# Spire tower, left of centre
add('<path d="M150 70 L156 40 L158 18 L160 40 L166 70 Z" fill="#24222c"/>')
add('<circle cx="158" cy="18" r="1.6" fill="#ff8fb1"/><circle cx="158" cy="18" r="5" fill="#ff8fb1" opacity="0.35" filter="url(#softGlow)"/>')

# Left building: concrete wall, fire escape, lamp
add('<path d="M0 0 H112 V560 L0 600 Z" fill="url(#leftWall)"/>')
for y in range(40, 540, 34):
    add(f'<rect x="10" y="{y}" width="40" height="18" fill="#0f0f12" opacity="0.8"/>')
    if rnd.random() < 0.25:
        add(f'<rect x="12" y="{y + 2}" width="36" height="14" fill="#c9a6b4" opacity="0.25"/>')
for y in range(150, 480, 60):  # fire escape
    add(f'<path d="M58 {y} H108 M58 {y} L108 {y - 40} M58 {y} V{y + 8} M108 {y} V{y + 8}" stroke="#4a4950" stroke-width="1.5" fill="none"/>')
add('<path d="M28 470 V560" stroke="#3a3940" stroke-width="3"/><path d="M28 470 Q28 462 40 462 H46" stroke="#3a3940" stroke-width="3" fill="none"/>')
add('<circle cx="46" cy="466" r="70" fill="url(#lamp)"/><rect x="40" y="462" width="12" height="4" rx="2" fill="#fff6ea"/>')

# Right building: brick wall, garage door, window, graffiti
add('<path d="M232 210 H390 V610 H232 Z" fill="url(#brick)"/>')
add('<path d="M232 210 H390 V610 H232 Z" fill="url(#bricks)"/>')
add('<rect x="232" y="206" width="158" height="6" fill="#2a1a20"/>')
# Garage door
add('<rect x="246" y="330" width="96" height="190" fill="#2a1a20"/>')
add('<rect x="250" y="334" width="88" height="186" fill="url(#door)"/>')
add('<rect x="250" y="334" width="88" height="186" fill="url(#slats)"/>')
add('<rect x="250" y="334" width="88" height="70" fill="#ffffff" opacity="0.08"/>')
# Right window with grid
add('<rect x="352" y="300" width="38" height="70" fill="#2a1a20"/>')
add('<rect x="355" y="303" width="35" height="64" fill="#e39aae" opacity="0.55"/>')
add('<path d="M355 324 H390 M355 345 H390 M372 303 V367" stroke="#4a1f2c" stroke-width="2"/>')
# Graffiti column (abstract tags)
add('<rect x="342" y="380" width="8" height="150" fill="#3a1820"/>')
for _ in range(5):
    gx, gy = rnd.uniform(343, 386), rnd.uniform(390, 520)
    add(f'<ellipse cx="{gx:.1f}" cy="{gy:.1f}" rx="{rnd.uniform(4, 11):.1f}" ry="{rnd.uniform(3, 8):.1f}" fill="{rnd.choice(["#c2304a", "#1a0f12", "#e07a8f"])}" opacity="0.75" transform="rotate({rnd.uniform(-30, 30):.0f} {gx:.1f} {gy:.1f})"/>')

# Logo sign above the door (where the game had its logo)
add('<g transform="translate(300 258)">')
if LOGO_HREF:
    # Neon emblem mounted straight on the brick, like the game's logo above the garage
    add('<ellipse cx="0" cy="0" rx="70" ry="40" fill="#ff5a87" opacity="0.18" filter="url(#glow)"/>')
    add(f'<image href="{LOGO_HREF}" x="-66" y="-41" width="132" height="81" preserveAspectRatio="xMidYMid meet"/>')
else:
    add('<rect x="-62" y="-26" width="124" height="52" rx="8" fill="#1a1520" stroke="#cfc3d8" stroke-width="2" opacity="0.92"/>')
    add('<text x="0" y="7" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-style="italic" font-weight="700" font-size="18" letter-spacing="0.6" fill="url(#signFace)" stroke="#2a1a2e" stroke-width="0.6">PETROLHEADS</text>')
    add('<rect x="-62" y="-26" width="124" height="52" rx="8" fill="none" stroke="#ff9ec0" stroke-width="2" opacity="0.6" filter="url(#softGlow)"/>')
add('</g>')

# Pink neon tube across the brick wall, with glow
add('<g transform="rotate(-4 300 300)">')
add('<rect x="200" y="300" width="210" height="10" fill="#ff5a87" opacity="0.55" filter="url(#glow)"/>')
add('<rect x="200" y="303" width="210" height="4" rx="2" fill="#ffd6e3"/>')
add('<rect x="205" y="304" width="200" height="1.6" rx="1" fill="#ffffff"/>')
add('</g>')

# ROAD CLOSED barrier
add('<clipPath id="barrierClip"><rect width="56" height="22"/></clipPath>')
add('<g transform="translate(270 506)"><rect width="56" height="22" fill="#d9a524"/><g clip-path="url(#barrierClip)">')
for i in range(-2, 8):
    add(f'<path d="M{i * 9} 22 L{i * 9 + 11} 0 H{i * 9 + 16} L{i * 9 + 5} 22 Z" fill="#141414" opacity="0.85"/>')
add('</g>')
add('<rect x="6" y="5" width="44" height="12" fill="#e8c76a"/><text x="28" y="14" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#2a2a2a">ROAD CLOSED</text>')
add('<circle cx="34" cy="-8" r="3" fill="#ff8a2a"/><circle cx="34" cy="-8" r="8" fill="#ff8a2a" opacity="0.35" filter="url(#softGlow)"/></g>')

# Wet ground with pink and lamp reflections
add(f'<path d="M0 600 L112 560 H232 V610 H390 V{H} H0 Z" fill="url(#ground)"/>')
add('<ellipse cx="300" cy="660" rx="110" ry="60" fill="#ff6f98" opacity="0.22" filter="url(#glow)"/>')
add('<ellipse cx="300" cy="640" rx="70" ry="10" fill="#ffc2d4" opacity="0.18" filter="url(#softGlow)"/>')
add('<rect x="26" y="570" width="40" height="160" fill="url(#lamp)" opacity="0.5"/>')
for _ in range(26):  # puddle highlights
    x, y = rnd.uniform(0, W), rnd.uniform(620, H)
    add(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(6, 22):.0f}" ry="1.2" fill="#e8c9d6" opacity="{rnd.uniform(0.05, 0.18):.2f}"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#fog)"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>')
add("</svg>")

path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "bg-alley.svg")
with open(path, "w") as f:
    f.write("\n".join(out))
print("wrote", os.path.normpath(path), sum(len(s) for s in out) // 1024, "KB")
