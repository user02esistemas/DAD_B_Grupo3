const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

const imagesToOptimize = [
  { name: 'banner.png', out: 'banner.webp', width: 1920, quality: 80 },
  { name: 'cajamarca.png', out: 'cajamarca.webp', width: 800, quality: 75 },
  { name: 'chiclayo.png', out: 'chiclayo.webp', width: 800, quality: 75 },
  { name: 'trujillo.png', out: 'trujillo.webp', width: 800, quality: 75 },
  { name: 'jaen.png', out: 'jaen.webp', width: 800, quality: 80 },
  { name: 'prom_1.png', out: 'prom_1.webp', width: 400, quality: 75 },
  { name: 'prom_2.png', out: 'prom_2.webp', width: 400, quality: 75 },
  { name: 'prom_3.png', out: 'prom_3.webp', width: 400, quality: 75 },
  { name: 'prom_4.png', out: 'prom_4.webp', width: 400, quality: 75 },
  { name: 'imagen-centro-ayuda.png', out: 'imagen-centro-ayuda.webp', width: 1920, quality: 80 }
];

async function run() {
  console.log('Optimizing images...');
  for (const img of imagesToOptimize) {
    const inputPath = path.join(publicDir, img.name);
    const outputPath = path.join(publicDir, img.out);

    if (fs.existsSync(inputPath)) {
      console.log(`Processing ${img.name}...`);
      try {
        await sharp(inputPath)
          .resize({ width: img.width, withoutEnlargement: true })
          .webp({ quality: img.quality })
          .toFile(outputPath);
        
        const oldSize = fs.statSync(inputPath).size;
        const newSize = fs.statSync(outputPath).size;
        console.log(`Successfully optimized ${img.name}: ${(oldSize / 1024 / 1024).toFixed(2)} MB -> ${(newSize / 1024).toFixed(2)} KB`);
      } catch (err) {
        console.error(`Error processing ${img.name}:`, err);
      }
    } else {
      console.log(`File not found: ${img.name}, skipping.`);
    }
  }
  console.log('Optimization complete!');
}

run();
