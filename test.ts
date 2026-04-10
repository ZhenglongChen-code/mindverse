/**
 * Mindverse 核心功能测试脚本
 * 用法: npx ts-node test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { MindverseCore } from './packages/core/src/index';

const BASE_PATH = __dirname;

async function main() {
  console.log('=== Mindverse 核心功能测试 ===\n');

  // 1. 检查配置文件
  const configPath = path.join(BASE_PATH, 'MindverseConfig', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log('当前配置:');
  console.log(`  模型提供商: ${config.modelProvider}`);
  console.log(`  触发模式: ${config.triggerMode}`);
  console.log(`  Inbox 目录: ${config.inboxPath}`);
  console.log(`  Wiki 目录: ${config.wikiSavePath}`);
  console.log('');

  // 2. 检查 Inbox 文件
  const inboxPath = path.join(BASE_PATH, config.inboxPath);
  const inboxFiles = fs.readdirSync(inboxPath).filter(f => f.endsWith('.md'));
  console.log(`Inbox 文件数量: ${inboxFiles.length}`);
  inboxFiles.forEach(f => console.log(`  - ${f}`));
  console.log('');

  // 3. 检查索引
  const indexPath = path.join(BASE_PATH, 'MindverseIndex', 'processedIndex.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  console.log(`已处理文件数量: ${index.processedFiles.length}`);
  console.log('');

  // 4. 检查 API Key
  const activeModel = config.modelConfigs[config.modelProvider];
  if (!activeModel?.apiKey) {
    console.log('❌ 错误: 未配置 API Key');
    console.log('请在 MindverseConfig/config.json 中填入 API Key');
    console.log(`当前模型: ${config.modelProvider} (${activeModel?.modelName})`);
    return;
  }
  console.log(`✓ API Key 已配置 (${config.modelProvider})`);
  console.log('');

  // 5. 询问是否执行处理
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (text: string): Promise<string> => {
    return new Promise(resolve => rl.question(text, resolve));
  };

  const answer = await question('是否执行处理？ (y/n): ');
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('测试取消');
    return;
  }

  // 6. 执行处理
  console.log('\n开始处理...\n');

  const core = new MindverseCore(BASE_PATH);

  try {
    const result = await core.processAll();

    console.log('\n=== 处理结果 ===');
    console.log(`成功: ${result.processed}`);
    console.log(`失败: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n错误列表:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    }

    if (result.results.length > 0) {
      console.log('\n生成的文件:');
      result.results.forEach(r => {
        if (r.success) {
          console.log(`  ✓ ${r.fileName} -> ${path.basename(r.wikiPath)}`);
        } else {
          console.log(`  ✗ ${r.fileName}: ${r.error}`);
        }
      });
    }

    // 7. 查看生成结果
    console.log('\n=== Wiki 目录内容 ===');
    const wikiPath = path.join(BASE_PATH, config.wikiSavePath);
    const walkDir = (dir: string, indent: string = '') => {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
          console.log(`${indent}📁 ${f}/`);
          walkDir(fp, indent + '  ');
        } else {
          console.log(`${indent}📄 ${f}`);
        }
      });
    };
    walkDir(wikiPath);

  } catch (error: any) {
    console.error('处理失败:', error.message);
  }
}

main().catch(console.error);
