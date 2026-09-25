const fs = require('fs');
const path = require('path');
const { generateQRSvg } = require('./qr-generator-core');

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

const bundle = items.map(item => ({
    key: item.key,
    title: item.title,
    files: item.files,
    url: item.url,
    svg: generateQRSvg(item.url, { size: 512, margin: 2, darkColor: '#12251a' })
}));

console.log(JSON.stringify(bundle));
