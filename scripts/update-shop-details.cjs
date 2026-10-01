const fs = require('fs');
const path = require('path');

const replacements = [
  // Phone strings
  { search: '94500 12345', replace: '91611 10030' },
  { search: '9450012345', replace: '9161110030' },
  // Address strings
  { search: 'Main Market Road, Near Ghantaghar, Barabanki, UP 225001', replace: 'Saraswati Sweets, Indira Market, Begum Gunj, Barabanki, Uttar Pradesh 225001' },
  { search: 'Main Market Road, Near Ghantaghar, Barabanki', replace: 'Saraswati Sweets, Indira Market, Begum Gunj, Barabanki, Uttar Pradesh 225001' },
  { search: 'Main Market Road, Near Ghantaghar', replace: 'Indira Market, Begum Gunj' },
  // Timings
  { search: '8:00 am – 10:00 pm', replace: '6:30 am – 10:00 pm' },
  { search: '8:00 am ?" 10:00 pm', replace: '6:30 am – 10:00 pm' },
  { search: '8:00 AM – 10', replace: '6:30 AM – 10' },
  { search: '08:00', replace: '06:30' },
];

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !['node_modules', '.git', 'dist'].includes(file)) {
      walk(filePath);
    } else if (stat.isFile() && ['.ts', '.tsx', '.sql'].includes(path.extname(file))) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      for (const r of replacements) {
        if (content.includes(r.search)) {
          content = content.split(r.search).join(r.replace);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
      }
    }
  }
}

walk('.');
