"""
Builds the web assets in frontend/public/brand/ from the club logos in design/logos/.
Needs Pillow:  python3 -m venv .venv && .venv/bin/pip install pillow && .venv/bin/python design/logos/make_brand_assets.py
"""
import os
from collections import deque

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "frontend", "public", "brand")
os.makedirs(OUT, exist_ok=True)


def fit(im: Image.Image, width: int) -> Image.Image:
    im = im.crop(im.getchannel("A").getbbox())
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def tint(lines: Image.Image, rgb) -> Image.Image:
    """Line-art logo recoloured: alpha is the shape, colour is uniform."""
    out = Image.new("RGBA", lines.size, rgb + (0,))
    out.putalpha(lines.getchannel("A"))
    return out


def save(im: Image.Image, name: str):
    im.save(os.path.join(OUT, name), optimize=True)
    print(f"{name:24} {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB")


# 1. Line emblem (transparent) → white for the UI, neon pink with glow for the background sign
lines = Image.open(os.path.join(HERE, "emblem-lines.png")).convert("RGBA")
save(fit(tint(lines, (255, 255, 255)), 640), "emblem-white.png")
pink = fit(tint(lines, (255, 214, 227)), 320)
glow = tint(pink, (255, 90, 135)).filter(ImageFilter.GaussianBlur(6))
sign = Image.new("RGBA", pink.size)
sign.alpha_composite(glow)
sign.alpha_composite(glow)
sign.alpha_composite(pink)
save(sign, "emblem-neon.png")

# 2. Script wordmark: only its outline is opaque (the letters are see-through), so recolour the outline
word = Image.open(os.path.join(HERE, "wordmark.png")).convert("RGBA")
save(fit(tint(word, (255, 255, 255)), 720), "wordmark.png")
save(fit(tint(word, (185, 240, 95)), 720), "wordmark-lime.png")

# 3. Filled sticker emblem: knock out the white page around the sticker (flood fill from the edges)
sticker = Image.open(os.path.join(HERE, "emblem-sticker.png")).convert("RGBA")
px = sticker.load()
w, h = sticker.size
seen = bytearray(w * h)
q = deque((x, y) for x in range(w) for y in (0, h - 1))
q.extend((x, y) for y in range(h) for x in (0, w - 1))
while q:
    x, y = q.popleft()
    if seen[y * w + x]:
        continue
    seen[y * w + x] = 1
    r, g, b, _ = px[x, y]
    if r + g + b < 3 * 200:  # reached the sticker's black outline
        continue
    px[x, y] = (255, 255, 255, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
            q.append((nx, ny))
save(fit(sticker, 560), "emblem-sticker.png")

# 4. App icon: white emblem on the app's dark background
icon = Image.new("RGBA", (512, 512), (20, 20, 27, 255))
e = fit(tint(lines, (255, 255, 255)), 440)
icon.alpha_composite(e, ((512 - e.width) // 2, (512 - e.height) // 2))
save(icon.resize((192, 192), Image.LANCZOS), "icon-192.png")
save(icon, "icon-512.png")
