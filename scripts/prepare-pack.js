import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.dirname(__dirname);
const distDir = path.join(projectRoot, 'dist');

// 读取根目录的 package.json
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
);

// 生成 dist/package.json（只包含发布需要的字段）
const distPackageJson = {
  name: rootPackageJson.name,
  version: rootPackageJson.version,
  type: rootPackageJson.type,
  description: rootPackageJson.description,
  license: rootPackageJson.license,
  files: [
    'src',
    'index.js',
    'index.d.ts',
    'index.js.map',
    'index.d.ts.map',
    'openclaw.plugin.json',
    'skills'
  ],
  dependencies: rootPackageJson.dependencies,
  bundledDependencies: rootPackageJson.bundledDependencies,
  peerDependencies: rootPackageJson.peerDependencies,
  openclaw: rootPackageJson.openclaw
};

// 写入 dist/package.json
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

// 复制 openclaw.plugin.json 到 dist/
const openclawPluginPath = path.join(projectRoot, 'openclaw.plugin.json');
if (fs.existsSync(openclawPluginPath)) {
  fs.copyFileSync(
    openclawPluginPath,
    path.join(distDir, 'openclaw.plugin.json')
  );
}

// 复制 skills 目录到 dist/
const skillsDir = path.join(projectRoot, 'skills');
const distSkillsDir = path.join(distDir, 'skills');

if (fs.existsSync(skillsDir)) {
  copyDirectory(skillsDir, distSkillsDir);
}

// 复制 README.md 到 dist/
const readmePath = path.join(projectRoot, 'README.md');
if (fs.existsSync(readmePath)) {
  fs.copyFileSync(readmePath, path.join(distDir, 'README.md'));
}

// 在 dist 目录下执行 npm install 以安装 bundledDependencies
console.log('Installing dependencies in dist/ for bundledDependencies...');
execSync('npm install --omit=dev --ignore-scripts', { 
  cwd: distDir, 
  stdio: 'inherit' 
});

console.log('dist/package.json generated successfully');
console.log('Files copied to dist/: openclaw.plugin.json, skills/, README.md');
console.log('Dependencies installed in dist/node_modules for bundling');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
