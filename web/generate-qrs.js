const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { generateQRSvg } = require('../scripts/qr-generator-core');

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

const outDirs = [
    path.resolve(__dirname, 'Codigos QR')
];

for (const dir of outDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function run() {
    console.log('Generating QR codes...');
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    let browser = null;
    try {
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Chrome launched for high-res PNG rendering.');
    } catch (e) {
        console.warn('Chrome launch failed:', e.message);
    }

    for (const item of items) {
        console.log(`Rendering ${item.title} -> ${item.url}`);
        const svg = generateQRSvg(item.url, {
            size: 1024,
            margin: 2,
            darkColor: '#12251a',
            lightColor: '#ffffff'
        });

        for (const baseName of item.files) {
            for (const outDir of outDirs) {
                const svgFile = path.join(outDir, `${baseName}.svg`);
                fs.writeFileSync(svgFile, svg, 'utf8');

                if (browser) {
                    const page = await browser.newPage();
                    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 2 });
                    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;display:flex;align-items:center;justify-content:center;width:1024px;height:1024px;">${svg}</body></html>`, { waitUntil: 'load' });
                    const pngFile = path.join(outDir, `${baseName}.png`);
                    await page.screenshot({ path: pngFile, type: 'png' });
                    await page.close();
                }
            }
        }
    }

    if (browser) {
        await browser.close();
    }
    console.log('Done generating all QR codes!');
}

run().catch(console.error);
