import fs from 'fs';
import path from 'path';

const modelsDir = './src/models/pg';
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

console.log('🔄 Removing comments from model files...');

files.forEach(file => {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove comments that come after column definitions
  content = content.replace(/,\s*comment:\s*'[^']*'/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✓ Fixed: ${file}`);
});

console.log('✅ All comments removed');
