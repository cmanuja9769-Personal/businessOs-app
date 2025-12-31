const fs = require('fs');
const path = require('path');

// Copy .next/static to .next/standalone/.next/static
const staticSource = path.join(__dirname, '../.next/static');
const staticDest = path.join(__dirname, '../.next/standalone/.next/static');

// Copy public to .next/standalone/public
const publicSource = path.join(__dirname, '../public');
const publicDest = path.join(__dirname, '../.next/standalone/public');

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source ${src} does not exist, skipping...`);
    return;
  }

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying static assets for standalone build...');
copyDir(staticSource, staticDest);
console.log('✓ Copied .next/static');

copyDir(publicSource, publicDest);
console.log('✓ Copied public folder');

console.log('✓ Post-build complete!');
