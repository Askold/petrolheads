"""
Builds the bot's profile picture (design/logos/bot-avatar.png, 640x640) from the line emblem:
dark grey-pink background, pink neon ring, white emblem with a pink glow.
Telegram crops bot avatars to a circle, so everything sits inside it.
Run with Pillow: .venv/bin/python design/logos/make_bot_avatar.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
S = 640
C = S / 2

# Background: radial grey-pink glow fading to near-black
bg = Image.new("RGBA", (S, S))
px = bg.load()
for y in range(S):
    for x in range(S):
        d = min(1.0, math.hypot(x - C, y - C * 0.92) / (S * 0.62))
        r = round(70 * (1 - d) + 16 * d)
        g = round(38 * (1 - d) + 15 * d)
        b = round(54 * (1 - d) + 21 * d)
        px[x, y] = (r, g, b, 255)

# Neon ring: blurred glow plus a bright core, inside the circular crop
ring = Image.new("RGBA", (S, S))
d = ImageDraw.Draw(ring)
R = 268
d.ellipse((C - R, C - R, C + R, C + R), outline=(255, 90, 135, 255), width=16)
glow = ring.filter(ImageFilter.GaussianBlur(14))
core = Image.new("RGBA", (S, S))
ImageDraw.Draw(core).ellipse((C - R, C - R, C + R, C + R), outline=(255, 220, 232, 255), width=4)
bg.alpha_composite(glow)
bg.alpha_composite(glow)
bg.alpha_composite(core)

# Emblem: white lines with a pink glow behind
lines = Image.open(os.path.join(HERE, "emblem-lines.png")).convert("RGBA")
lines = lines.crop(lines.getchannel("A").getbbox())
w = 500
lines = lines.resize((w, round(lines.height * w / lines.width)), Image.LANCZOS)
alpha = lines.getchannel("A")
white = Image.new("RGBA", lines.size, (255, 255, 255, 0))
white.putalpha(alpha)
pink = Image.new("RGBA", lines.size, (255, 90, 135, 0))
pink.putalpha(alpha)
pos = (round(C - lines.width / 2), round(C - lines.height / 2) + 6)
halo = Image.new("RGBA", (S, S))
halo.alpha_composite(pink, pos)
halo = halo.filter(ImageFilter.GaussianBlur(9))
bg.alpha_composite(halo)
bg.alpha_composite(white, pos)

out = os.path.join(HERE, "bot-avatar.png")
bg.convert("RGB").save(out, optimize=True)
print("wrote", out)
