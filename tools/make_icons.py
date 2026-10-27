#!/usr/bin/env python3
"""Generates the PWA icons (no external deps: pure zlib PNG writer)."""
import math, struct, zlib, os

def png(path, w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        row = px[y]
        for x in range(w):
            r, g, b, a = row[x]
            raw += bytes((r, g, b, a))
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    out += chunk(b'IEND', b'')
    open(path, 'wb').write(out)

def in_pent(x, y, r, rot):
    """Point inside a regular pentagon of circumradius r, rotated by `rot`."""
    for k in range(5):
        a0 = rot + k * 2 * math.pi / 5
        nx, ny = math.cos(a0), math.sin(a0)
        if x * nx + y * ny > r * math.cos(math.pi / 5):
            return False
    return True

def mix(c1, c2, t):
    return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(3))

def render(size, maskable=False, ss=4):
    W = size * ss
    inset = 0.0 if maskable else 0.055
    radius = 0.50 if maskable else 0.225        # rounded square
    scale = 0.80 if maskable else 1.0           # keep art inside the safe zone
    acc = [[(0, 0, 0, 0)] * size for _ in range(size)]
    buf = [[(0.0, 0.0, 0.0, 0.0)] * W for _ in range(W)]

    cx = cy = W / 2
    for y in range(W):
        for x in range(W):
            u = (x + 0.5) / W
            v = (y + 0.5) / W
            # --- rounded square mask ---
            qx = abs(u - 0.5) - (0.5 - inset - radius)
            qy = abs(v - 0.5) - (0.5 - inset - radius)
            d = math.hypot(max(qx, 0), max(qy, 0)) - radius
            if not maskable and d > 0.004:
                continue
            inside = 1.0 if d < 0 else 0.0
            # --- backdrop: deep navy with a soft top-light ---
            top = mix((16, 26, 40), (6, 9, 15), min(1.0, (v * 1.25)))
            col = list(top)
            # --- green->cyan swoosh ---
            sx = (u - 0.5) / scale
            sy = (v - 0.5) / scale
            band = sy + sx * 0.52 + 0.085
            bw = 0.115
            if abs(band) < bw:
                t = (band + bw) / (2 * bw)
                sw = mix((47, 224, 138), (86, 217, 255), t)
                a = 1 - (abs(band) / bw) ** 3
                col = list(mix(col, sw, a))
            # --- pitch arc (centre circle hint) ---
            rr = math.hypot(sx * 1.0, sy * 1.0)
            if 0.345 < rr < 0.375 and sy < 0.26:
                col = list(mix(col, (225, 240, 255), 0.30))
            # --- the ball ---
            bx, by = sx - 0.105, sy - 0.055
            br = math.hypot(bx, by)
            BR = 0.215
            if br < BR:
                sh = max(0.0, 1 - (br / BR) ** 2)
                base = mix((255, 255, 255), (150, 168, 188), min(1.0, (bx * 1.5 + by * 1.8 + 0.55)))
                col = list(base)
                # classic black pentagon panels
                if in_pent(bx, by, BR * 0.335, -math.pi / 2):
                    col = list(mix(col, (22, 28, 38), 0.94))
                for k in range(5):
                    a0 = -math.pi / 2 + k * 2 * math.pi / 5
                    ox = math.cos(a0) * BR * 0.80
                    oy = math.sin(a0) * BR * 0.80
                    if in_pent(bx - ox, by - oy, BR * 0.285, a0 + math.pi / 5):
                        col = list(mix(col, (22, 28, 38), 0.94))
                # rim + specular
                if br > BR * 0.93:
                    col = list(mix(col, (90, 105, 125), 0.5))
                col = list(mix(col, (255, 255, 255), 0.22 * sh * max(0.0, -bx - by)))
            buf[y][x] = (col[0], col[1], col[2], 255.0 * inside if not maskable else 255.0)

    # downsample
    for y in range(size):
        row = []
        for x in range(size):
            r = g = b = a = 0.0
            for dy in range(ss):
                for dx in range(ss):
                    p = buf[y * ss + dy][x * ss + dx]
                    r += p[0]; g += p[1]; b += p[2]; a += p[3]
            n = ss * ss
            row.append((int(r / n), int(g / n), int(b / n), int(a / n)))
        acc[y] = row
    return acc

os.makedirs('icons', exist_ok=True)
jobs = [(192, False, 'icons/icon-192.png'), (512, False, 'icons/icon-512.png'),
        (180, False, 'icons/icon-180.png'), (32, False, 'icons/favicon-32.png'),
        (192, True, 'icons/icon-maskable-192.png'), (512, True, 'icons/icon-maskable-512.png')]
for size, mask, path in jobs:
    ss = 3 if size >= 512 else 4
    png(path, size, size, render(size, mask, ss))
    print(path, os.path.getsize(path), 'bytes')
