#!/usr/bin/env node

/**
 * console.log를 logger로 일괄 마이그레이션하는 스크립트
 *
 * 사용법:
 * node scripts/migrate-console-to-logger.js
 */

const fs = require('fs')
const path = require('path')

// 처리할 파일 목록 (이미 처리된 파일 제외)
const filesToProcess = [
  'app/(main)/community/page.tsx',
  'app/(main)/profile/[userId]/page.tsx',
  'app/(main)/post/[id]/page.tsx',
  'app/(main)/today/page.tsx',
  'app/(main)/feed/page.tsx',
  'app/(main)/chats/[roomId]/page.tsx',
  'app/(main)/chats/page.tsx',
  'app/(main)/community/[id]/page.tsx',
  'app/(main)/community/new/page.tsx',
  'lib/hooks/useMessages.ts',
  'lib/hooks/useNotifications.ts',
  'lib/hooks/useSale.ts',
  'lib/hooks/useAppointment.ts',
  'lib/hooks/useUnreadCount.ts',
  'lib/contexts/UserContext.tsx',
  'lib/cache/memoryCache.ts',
  'components/chat/AppointmentProposalForm.tsx',
  'components/chat/AppointmentCard.tsx',
  'components/chat/CompleteSaleButton.tsx',
  'components/review/ReviewModal.tsx',
  'app/(auth)/forgot-password/page.tsx',
  'app/(auth)/verify-email/page.tsx',
  'app/(auth)/reset-password/page.tsx',
  'app/(auth)/onboarding/step/2/page.tsx',
  'app/(auth)/onboarding/step/3/page.tsx',
  'app/(auth)/onboarding/step/4/page.tsx',
  'app/(main)/settings/page.tsx',
  'app/(main)/settings/delete-account/page.tsx',
  'components/auth/SignupForm.tsx',
  'components/auth/LoginForm.tsx',
  'components/post/EditPostForm.tsx',
  'components/post/NewPostForm.tsx',
  'components/onboarding/LocationOnboarding.tsx',
  'app/auth/callback/route.ts',
  'app/api/chat-rooms/[roomId]/route.ts',
  'app/api/exchange-rates/route.ts',
  'app/api/exchange-rates/history/route.ts',
]

const projectRoot = path.resolve(__dirname, '..')

function processFile(filePath) {
  const fullPath = path.join(projectRoot, filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  파일 없음: ${filePath}`)
    return
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false

  // console을 사용하는지 확인
  const hasConsole = /console\.(log|error|warn|info|debug)/.test(content)
  if (!hasConsole) {
    console.log(`⏭️  console 없음: ${filePath}`)
    return
  }

  // 이미 logger를 import했는지 확인
  const hasLoggerImport = /from ['"]@?\/lib\/logger['"]/.test(content)

  if (!hasLoggerImport) {
    // 파일 타입에 따라 적절한 위치에 import 추가
    const isClientComponent = content.startsWith("'use client'") || content.startsWith('"use client"')
    const isServerComponent = !isClientComponent && !content.includes('export default function') && filePath.endsWith('.tsx')

    // 네임스페이스 결정 (파일명 기반)
    const fileName = path.basename(filePath, path.extname(filePath))
    const namespace = fileName.charAt(0).toUpperCase() + fileName.slice(1)

    // import 문 추가
    const importStatement = `import { createNamespacedLogger } from '@/lib/logger'\n\nconst logger = createNamespacedLogger('${namespace}')\n`

    // 'use client' 다음이나 첫 import 전에 추가
    if (isClientComponent) {
      content = content.replace(/('use client'|"use client")\n\n/, `$1\n\n${importStatement}`)
      modified = true
    } else {
      // 첫 번째 import 문 앞에 추가
      const firstImportIndex = content.search(/^import /m)
      if (firstImportIndex !== -1) {
        content = content.slice(0, firstImportIndex) + importStatement + '\n' + content.slice(firstImportIndex)
        modified = true
      }
    }
  }

  // console.log -> logger.log 등으로 교체
  const replacements = [
    [/console\.log\(/g, 'logger.log('],
    [/console\.error\(/g, 'logger.error('],
    [/console\.warn\(/g, 'logger.warn('],
    [/console\.info\(/g, 'logger.info('],
    [/console\.debug\(/g, 'logger.debug('],
  ]

  let replacementCount = 0
  replacements.forEach(([pattern, replacement]) => {
    const matches = content.match(pattern)
    if (matches) {
      replacementCount += matches.length
      content = content.replace(pattern, replacement)
      modified = true
    }
  })

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`✅ 완료: ${filePath} (${replacementCount}개 교체)`)
  } else {
    console.log(`⏭️  변경 없음: ${filePath}`)
  }
}

console.log('🚀 console.log → logger 마이그레이션 시작\n')

filesToProcess.forEach(processFile)

console.log('\n✅ 마이그레이션 완료!')
