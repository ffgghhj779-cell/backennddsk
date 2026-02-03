/**
 * Knowledge Base Backup Script
 * Creates a timestamped backup of all knowledge files
 */

const fs = require('fs');
const path = require('path');

const knowledgeDir = path.join(__dirname, '..', 'knowledge');
const backupDir = path.join(__dirname, '..', 'backups', 'knowledge');
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupPath = path.join(backupDir, `knowledge-backup-${timestamp}`);

console.log('📦 Creating knowledge base backup...\n');

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create timestamped backup folder
fs.mkdirSync(backupPath, { recursive: true });

// Copy all files recursively
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursive(knowledgeDir, backupPath);
  console.log(`✅ Backup created: ${backupPath}\n`);
  
  // List all files backed up
  const files = [];
  function listFiles(dir, prefix = '') {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        listFiles(filePath, prefix + file + '/');
      } else {
        files.push(prefix + file);
      }
    });
  }
  
  listFiles(backupPath);
  console.log(`📄 Files backed up: ${files.length}`);
  files.forEach(file => console.log(`   • ${file}`));
  
  console.log('\n💡 To restore, copy files from:');
  console.log(`   ${backupPath}\n`);
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}
