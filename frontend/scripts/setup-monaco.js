const fs = require('fs-extra');
const path = require('path');

// 定义源目录和目标目录
const monacoSourceDir = path.resolve(__dirname, '../node_modules/monaco-editor/min');
const monacoTargetDir = path.resolve(__dirname, '../public/monaco-editor/min');

async function copyMonacoResources() {
  try {
    // 检查源目录是否存在
    if (!fs.existsSync(monacoSourceDir)) {
      console.error('Monaco Editor source directory not found. Installing monaco-editor...');
      require('child_process').execSync('npm install monaco-editor@0.36.1', { stdio: 'inherit' });
      
      // 再次检查
      if (!fs.existsSync(monacoSourceDir)) {
        throw new Error('Failed to install monaco-editor. Please install it manually.');
      }
    }
    
    // 确保目标目录存在
    fs.ensureDirSync(path.dirname(monacoTargetDir));
    
    // 复制 Monaco 编辑器资源
    console.log(`Copying Monaco Editor resources from ${monacoSourceDir} to ${monacoTargetDir}...`);
    fs.copySync(monacoSourceDir, monacoTargetDir);
    
    console.log('Monaco Editor resources have been successfully copied to public directory.');
    console.log('✅ You can now configure Monaco Editor to use local resources.');
    
    // 提供配置指南
    console.log('\nUpdate your configuration in EditorComponent.tsx to:');
    console.log(`
// 配置 Monaco 编辑器加载器使用本地资源
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});
    `);
    
    console.log(`
// Monaco Worker 配置
window.MonacoEnvironment = {
  getWorkerUrl: (workerId, label) => {
    return '/monaco-editor/min/vs/base/worker/workerMain.js';
  }
};
    `);
  } catch (error) {
    console.error('Error copying Monaco Editor resources:', error);
    process.exit(1);
  }
}

copyMonacoResources(); 