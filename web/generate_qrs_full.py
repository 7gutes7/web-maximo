import os
import json
import subprocess
import zlib
import struct

def create_png(matrix, scale=24, margin=4, rgb_dark=(18, 37, 26), rgb_light=(255, 255, 255)):
    dim = len(matrix)
    full_dim = dim + margin * 2
    width = full_dim * scale
    height = full_dim * scale
    
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # Filter type 0 (None)
        my = (y // scale) - margin
        for x in range(width):
            mx = (x // scale) - margin
            is_dark = False
            if 0 <= my < dim and 0 <= mx < dim:
                is_dark = matrix[my][mx]
            color = rgb_dark if is_dark else rgb_light
            raw.extend(color)
            
    def make_chunk(chunk_type, data):
        length = len(data)
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return struct.pack('>I', length) + chunk_type + data + struct.pack('>I', crc)
        
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    
    png = b'\x89PNG\r\n\x1a\n' + make_chunk(b'IHDR', ihdr) + make_chunk(b'IDAT', idat) + make_chunk(b'IEND', b'')
    return png

def create_svg(matrix, margin=2, dark_color="#12251a", light_color="#ffffff"):
    dim = len(matrix)
    view_size = dim + margin * 2
    rects = []
    for r in range(dim):
        for c in range(dim):
            if matrix[r][c]:
                rects.append(f'<rect x="{c + margin}" y="{r + margin}" width="1" height="1" fill="{dark_color}" />')
    
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_size} {view_size}" width="1024" height="1024" shape-rendering="crispEdges">
  <rect width="{view_size}" height="{view_size}" fill="{light_color}" />
  <g>{''.join(rects)}</g>
</svg>'''
    return svg

# Get QR matrices from node generator
node_script = """
const { QRCodeModel } = require('./scripts/qr-generator-core');
const baseUrl = 'https://valor-maximo.com';

const items = [
    { key: 'riva-palacio', title: 'Riva Palacio', files: ['QR Riva Palacio'], url: `${baseUrl}/?ficha=riva-palacio` },
    { key: 'sub-level', title: 'Paseo Central', files: ['QR Paseo Central'], url: `${baseUrl}/?ficha=sub-level` },
    { key: 'avenida-central', title: 'Plaza Independencia', files: ['QR Plaza Independencia'], url: `${baseUrl}/?ficha=avenida-central` },
    { key: 'distrito-financiero', title: 'Pino Suárez', files: ['QR Pino Suarez', 'QR Pino Suárez'], url: `${baseUrl}/?ficha=distrito-financiero` },
    { key: 'paseo-artes', title: 'Edificio Hidalgo', files: ['QR Hidalgo', 'QR Edificio Hidalgo'], url: `${baseUrl}/?ficha=paseo-artes` },
    { key: 'felipe-villanueva', title: 'Felipe Villanueva', files: ['QR Felipe Villanueva'], url: `${baseUrl}/?ficha=felipe-villanueva` },
    { key: 'villada', title: 'Villada', files: ['QR Villada'], url: `${baseUrl}/?ficha=villada` },
    { key: 'solidaridad-torres', title: 'Solidaridad Torres', files: ['QR Solidaridad Torres', 'QR Av Solidaridad Torres'], url: `${baseUrl}/?ficha=solidaridad-torres` },
    { key: 'plaza-ceboruco', title: 'Plaza Ceboruco', files: ['QR Plaza Ceboruco'], url: `${baseUrl}/?ficha=plaza-ceboruco` },
    { key: 'av-lerdo', title: 'Av. Lerdo', files: ['QR Av Lerdo', 'QR Lerdo'], url: `${baseUrl}/?ficha=av-lerdo` },
    { key: 'benito-juarez', title: 'Benito Juárez', files: ['QR Benito Juarez', 'QR Benito Juárez'], url: `${baseUrl}/?ficha=benito-juarez` },
    { key: 'plaza-rancho-el-meson-ii', title: 'Rancho El Mesón', files: ['QR Rancho El Meson', 'QR Plaza Rancho El Meson II'], url: `${baseUrl}/?ficha=plaza-rancho-el-meson-ii` },
    { key: 'unni-plaza', title: 'Unni Plaza', files: ['QR Unni Plaza'], url: `${baseUrl}/?ficha=unni-plaza` },
    { key: 'venustiano-carranza', title: 'Venustiano Carranza', files: ['QR Venustiano Carranza'], url: `${baseUrl}/?ficha=venustiano-carranza` },
    { key: 'wenceslao-labra', title: 'Wenceslao Labra', files: ['QR Wenceslao Labra'], url: `${baseUrl}/?ficha=wenceslao-labra` },
    { key: 'brigida-garcia', title: 'Brígida García', files: ['QR Brigida Garcia', 'QR Brígida García'], url: `${baseUrl}/?ficha=brigida-garcia` },
    { key: 'hero-web', title: 'Sitio Web Principal', files: ['QR Hero', 'QR Valor Maximo', 'QR Pagina Web'], url: `${baseUrl}/` }
];

const result = items.map(item => {
    const qr = new QRCodeModel(0, 0);
    qr.addData(item.url);
    qr.make();
    const count = qr.getModuleCount();
    const matrix = [];
    for (let r = 0; r < count; r++) {
        const row = [];
        for (let c = 0; c < count; c++) {
            row.push(qr.isDark(r, c));
        }
        matrix.push(row);
    }
    return {
        key: item.key,
        title: item.title,
        files: item.files,
        url: item.url,
        matrix: matrix
    };
});

console.log(JSON.stringify(result));
"""

out = subprocess.check_output(['node', '-e', node_script], cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
data = json.loads(out)

dest_dirs = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), 'Codigos QR'))
]

for d in dest_dirs:
    os.makedirs(d, exist_ok=True)

for item in data:
    matrix = item['matrix']
    png_data = create_png(matrix, scale=24, margin=4)
    svg_data = create_svg(matrix, margin=2)
    
    for filename in item['files']:
        for d in dest_dirs:
            png_path = os.path.join(d, f"{filename}.png")
            svg_path = os.path.join(d, f"{filename}.svg")
            with open(png_path, 'wb') as f:
                f.write(png_data)
            with open(svg_path, 'w', encoding='utf-8') as f:
                f.write(svg_data)
        print(f"Generated {filename}.png and {filename}.svg")

print("All PNG and SVG QR codes generated successfully!")
