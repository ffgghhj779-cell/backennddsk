/**
 * Log Cleanup Script
 * Removes old conversation logs to save disk space
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs', 'conversations');
const daysToKeep = parseInt(process.argv[2]) || 30;

console.log(`🧹 Cleaning logs older than ${daysToKeep} days...\n`);

if (!fs.existsSync(logsDir)) {
  console.log('ℹ️  No logs directory found. Nothing to clean.');
  process.exit(0);
}

const files = fs.readdirSync(logsDir);
const now = Date.now();
const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Convert days to milliseconds

let deletedCount = 0;
let totalSize = 0;

files.forEach(file => {
  const filePath = path.join(logsDir, file);
  const stats = fs.statSync(filePath);
  const age = now - stats.mtimeMs;
  
  if (age > maxAge) {
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`🗑️  Deleting: ${file} (${sizeKB} KB, ${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
    fs.unlinkSync(filePath);
    deletedCount++;
    totalSize += stats.size;
  }
});

if (deletedCount > 0) {
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Deleted ${deletedCount} files, freed ${totalSizeMB} MB\n`);
} else {
  console.log('✅ No old logs to delete.\n');
}
