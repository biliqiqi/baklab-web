import { Command } from 'commander'
import fs from 'fs'
import { glob } from 'glob'

const program = new Command()

// Setup command line arguments
program
  .name('extract-lang')
  .description('Extract matching text from files and generate JavaScript file')
  .option(
    '-f, --files <glob>',
    'Files to scan (glob pattern)',
    (value, previous) => {
      return previous.concat([value])
    },
    []
  )
  .option('-o, --out <file>', 'Output file path', 'src/i18n/lang_text.js')
  .option(
    '-r, --regex <pattern>',
    'Regular expression for matching',
    '\\p{Script=Han}+'
  )
  .option(
    '-c, --current <file>',
    'Current extracted language data file (JSON)',
    'src/i18n/zh-Hans.json'
  )
  .parse(process.argv)

const options = program.opts()

// Check required parameters
if (options.files.length === 0) {
  console.error(
    'Error: Please provide at least one file glob pattern (-f or --files)'
  )
  process.exit(1)
}

// Ensure regex is valid
let matchRegex
try {
  // Add global and Unicode flags
  matchRegex = new RegExp(options.regex, 'gu')
} catch (err) {
  console.error(`Error: Invalid regex "${options.regex}": ${err.message}`)
  process.exit(1)
}

// Main processing function
async function processFiles() {
  // Global set for cross-file deduplication
  const allUniqueMatches = new Map() // Match text -> key mapping
  const fileMatches = new Map() // File -> match set mapping
  let keyCounter = 0

  // Load current extracted data (if exists)
  const existingEntries = new Map() // Existing text -> key mapping
  const existingKeys = new Set() // Used key set

  if (options.current) {
    try {
      // Check if file exists
      if (fs.existsSync(options.current)) {
        const currentContent = fs.readFileSync(options.current, 'utf8')
        let currentData

        // Try to parse as JavaScript module (export default {...})
        if (currentContent.includes('export default')) {
          // Extract content within braces
          const match = currentContent.match(
            /export\s+default\s+(\{[\s\S]*\})/m
          )
          if (match && match[1]) {
            try {
              // Convert extracted object string to JSON format (replace quotes in keys)
              const jsonStr = match[1].replace(/(\w+):/g, '"$1":')
              currentData = JSON.parse(jsonStr)
            } catch (e) {
              console.warn(`警告: 无法解析JavaScript模块内容: ${e.message}`)
            }
          }
        }

        // If above method fails, try parsing directly as JSON
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

        // Populate existing entries mapping
        if (currentData) {
          // Reverse key-value pairs to build text->key mapping
          for (const [key, value] of Object.entries(currentData)) {
            existingEntries.set(value, key)
            existingKeys.add(key)
          }
          console.log(`Loaded ${existingEntries.size} existing entries`)

          // Find maximum existing key number
          if (existingKeys.size > 0) {
            const keyNumbers = Array.from(existingKeys)
              .filter((k) => k.startsWith('key') && /^key\d+$/.test(k))
              .map((k) => parseInt(k.substring(3)))

            if (keyNumbers.length > 0) {
              keyCounter = Math.max(...keyNumbers) + 1
              console.log(`Continue generating new keys from key${keyCounter}`)
            }
          }
        }
      } else {
        console.warn(`警告: 指定的当前数据文件 ${options.current} 不存在`)
      }
    } catch (err) {
      console.error(`Error processing current data file:`, err)
    }
  }

  // Phase 1: Scan all files to collect matches
  for (const pattern of options.files) {
    try {
      // Use glob.sync instead of await, as glob is a synchronous API
      const files = glob.sync(pattern, { nodir: true })
      if (files.length === 0) {
        console.warn(`警告: 模式 "${pattern}" 没有匹配到任何文件`)
        continue
      }
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8')
          const fileMatchSet = new Set()
          // Reset regex lastIndex
          matchRegex.lastIndex = 0
          let match
          while ((match = matchRegex.exec(content)) !== null) {
            const matchText = match[0]
            fileMatchSet.add(matchText)

            // Record this match text in global set, prioritize using existing keys
            if (!allUniqueMatches.has(matchText)) {
              // Check if already exists in current data
              if (existingEntries.has(matchText)) {
                allUniqueMatches.set(matchText, existingEntries.get(matchText))
              } else {
                // Generate a new key
                allUniqueMatches.set(matchText, `key${keyCounter++}`)
              }
            }
          }
          // Only save files with matches
          if (fileMatchSet.size > 0) {
            fileMatches.set(file, fileMatchSet)
          }
        } catch (err) {
          console.error(`Error processing file ${file}:`, err)
        }
      }
    } catch (err) {
      console.error(`Error processing glob pattern "${pattern}":`, err)
    }
  }

  // Check if there are new matches
  const newMatchesCount = Array.from(allUniqueMatches.entries()).filter(
    ([text, key]) => !existingEntries.has(text)
  ).length

  console.log(
    `找到 ${allUniqueMatches.size} 个匹配项，其中 ${newMatchesCount} 个是新的`
  )

  // If no matches found
  if (allUniqueMatches.size === 0) {
    console.warn('Warning: No matches found')
    // Create empty object as output
    fs.writeFileSync(options.out, 'export default {};\n', 'utf8')
    console.log(`Generated empty JavaScript module: ${options.out}`)
    return
  }

  // Phase 2: Generate output file
  // Organize output structure: group by file but maintain unique keys
  const outputLines = ['export default {']

  // Generate grouped comments and key-value pairs by file
  for (const [file, matchSet] of fileMatches.entries()) {
    // Add file comment
    outputLines.push(`\n  // Source: ${file}`)
    // Add key-value pairs for each match in this file
    for (const matchText of matchSet) {
      const key = allUniqueMatches.get(matchText)
      outputLines.push(`  "${key}": "${escapeString(matchText)}",`)
    }
  }

  // Remove last comma
  if (outputLines[outputLines.length - 1].endsWith(',')) {
    outputLines[outputLines.length - 1] = outputLines[
      outputLines.length - 1
    ].slice(0, -1)
  }

  // Close object
  outputLines.push('};')

  // Write to file
  const output = outputLines.join('\n')
  fs.writeFileSync(options.out, output, 'utf8')
  console.log(`Generated JavaScript module: ${options.out}`)
  console.log(
    `共输出 ${allUniqueMatches.size} 个条目，其中 ${newMatchesCount} 个是新添加的`
  )
}

// Escape special characters in string
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

// Run main process
processFiles().catch((err) => {
  console.error('Error occurred:', err)
  process.exit(1)
})
