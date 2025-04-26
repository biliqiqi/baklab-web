import fs from 'fs'
import { glob } from 'glob'
import { Command } from 'commander'
const program = new Command()

// 设置命令行参数
program
  .name('extract-lang')
  .description('提取文件中的匹配文本并生成 JavaScript 文件')
  .option(
    '-f, --files <glob>',
    '要扫描的文件 (glob 模式)',
    (value, previous) => {
      return previous.concat([value])
    },
    []
  )
  .option('-o, --out <file>', '输出文件路径', 'src/i18n/lang_text.js')
  .option('-r, --regex <pattern>', '用于匹配的正则表达式', '\\p{Script=Han}+')
  .option(
    '-c, --current <file>',
    '当前已提取的语言数据文件(JSON)',
    'src/i18n/zh-Hans.json'
  )
  .parse(process.argv)

const options = program.opts()

// 检查必要的参数
if (options.files.length === 0) {
  console.error('错误: 请至少提供一个文件 glob 模式 (-f 或 --files)')
  process.exit(1)
}

// 确保正则表达式有效
let matchRegex
try {
  // 添加全局和 Unicode 标志
  matchRegex = new RegExp(options.regex, 'gu')
} catch (err) {
  console.error(`错误: 无效的正则表达式 "${options.regex}": ${err.message}`)
  process.exit(1)
}

// 主处理函数
async function processFiles() {
  // 用于跨文件去重的全局集合
  const allUniqueMatches = new Map() // 匹配文本 -> key 的映射
  const fileMatches = new Map() // 文件 -> 匹配集合 的映射
  let keyCounter = 0

  // 加载当前已提取的数据(如果存在)
  const existingEntries = new Map() // 现有文本 -> key 的映射
  const existingKeys = new Set() // 已使用的key集合

  if (options.current) {
    try {
      // 检查文件是否存在
      if (fs.existsSync(options.current)) {
        const currentContent = fs.readFileSync(options.current, 'utf8')
        let currentData

        // 尝试作为JavaScript模块解析(export default {...})
        if (currentContent.includes('export default')) {
          // 提取大括号内的内容
          const match = currentContent.match(
            /export\s+default\s+(\{[\s\S]*\})/m
          )
          if (match && match[1]) {
            try {
              // 将提取的对象字符串转换为JSON格式(替换键中的引号)
              const jsonStr = match[1].replace(/(\w+):/g, '"$1":')
              currentData = JSON.parse(jsonStr)
            } catch (e) {
              console.warn(`警告: 无法解析JavaScript模块内容: ${e.message}`)
            }
          }
        }

        // 如果上述方法失败，尝试直接作为JSON解析
        if (!currentData) {
          try {
            currentData = JSON.parse(currentContent)
          } catch (e) {
            console.error(
              `错误: 当前数据文件 ${options.current} 解析失败: ${e.message}`
            )
            process.exit(1)
          }
        }

        // 填充现有条目映射
        if (currentData) {
          // 反转键值对来构建文本->键的映射
          for (const [key, value] of Object.entries(currentData)) {
            existingEntries.set(value, key)
            existingKeys.add(key)
          }
          console.log(`已加载 ${existingEntries.size} 个现有条目`)

          // 找出现有的最大key数字
          if (existingKeys.size > 0) {
            const keyNumbers = Array.from(existingKeys)
              .filter((k) => k.startsWith('key') && /^key\d+$/.test(k))
              .map((k) => parseInt(k.substring(3)))

            if (keyNumbers.length > 0) {
              keyCounter = Math.max(...keyNumbers) + 1
              console.log(`继续从 key${keyCounter} 开始生成新键`)
            }
          }
        }
      } else {
        console.warn(`警告: 指定的当前数据文件 ${options.current} 不存在`)
      }
    } catch (err) {
      console.error(`处理当前数据文件时发生错误:`, err)
    }
  }

  // 第一阶段：扫描所有文件收集匹配
  for (const pattern of options.files) {
    try {
      // 使用 glob.sync 而不是 await，因为 glob 是同步 API
      const files = glob.sync(pattern, { nodir: true })
      if (files.length === 0) {
        console.warn(`警告: 模式 "${pattern}" 没有匹配到任何文件`)
        continue
      }
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8')
          const fileMatchSet = new Set()
          // 重置正则表达式的 lastIndex
          matchRegex.lastIndex = 0
          let match
          while ((match = matchRegex.exec(content)) !== null) {
            const matchText = match[0]
            fileMatchSet.add(matchText)

            // 在全局集合中记录这个匹配文本，优先使用现有的键
            if (!allUniqueMatches.has(matchText)) {
              // 检查是否已存在于当前数据中
              if (existingEntries.has(matchText)) {
                allUniqueMatches.set(matchText, existingEntries.get(matchText))
              } else {
                // 生成一个新键
                allUniqueMatches.set(matchText, `key${keyCounter++}`)
              }
            }
          }
          // 只保存有匹配的文件
          if (fileMatchSet.size > 0) {
            fileMatches.set(file, fileMatchSet)
          }
        } catch (err) {
          console.error(`处理文件 ${file} 时发生错误:`, err)
        }
      }
    } catch (err) {
      console.error(`处理 glob 模式 "${pattern}" 时发生错误:`, err)
    }
  }

  // 检查是否有新的匹配项
  const newMatchesCount = Array.from(allUniqueMatches.entries()).filter(
    ([text, key]) => !existingEntries.has(text)
  ).length

  console.log(
    `找到 ${allUniqueMatches.size} 个匹配项，其中 ${newMatchesCount} 个是新的`
  )

  // 如果没有找到任何匹配
  if (allUniqueMatches.size === 0) {
    console.warn('警告: 没有找到任何匹配项')
    // 创建一个空对象作为输出
    fs.writeFileSync(options.out, 'export default {};\n', 'utf8')
    console.log(`已生成空的 JavaScript 模块: ${options.out}`)
    return
  }

  // 第二阶段：生成输出文件
  // 组织输出结构：按文件分组但保持唯一键
  const outputLines = ['export default {']

  // 按文件生成分组注释和键值对
  for (const [file, matchSet] of fileMatches.entries()) {
    // 添加文件注释
    outputLines.push(`\n  // 来源: ${file}`)
    // 为此文件中的每个匹配添加键值对
    for (const matchText of matchSet) {
      const key = allUniqueMatches.get(matchText)
      outputLines.push(`  "${key}": "${escapeString(matchText)}",`)
    }
  }

  // 移除最后一个逗号
  if (outputLines[outputLines.length - 1].endsWith(',')) {
    outputLines[outputLines.length - 1] = outputLines[
      outputLines.length - 1
    ].slice(0, -1)
  }

  // 关闭对象
  outputLines.push('};')

  // 写入文件
  const output = outputLines.join('\n')
  fs.writeFileSync(options.out, output, 'utf8')
  console.log(`已生成 JavaScript 模块: ${options.out}`)
  console.log(
    `共输出 ${allUniqueMatches.size} 个条目，其中 ${newMatchesCount} 个是新添加的`
  )
}

// 转义字符串中的特殊字符
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

// 运行主流程
processFiles().catch((err) => {
  console.error('发生错误:', err)
  process.exit(1)
})
