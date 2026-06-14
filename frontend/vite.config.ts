import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('katex')) {
            return 'vendor-katex'
          }
          if (id.includes('prosemirror') || id.includes('@tiptap/pm')) {
            return 'vendor-prosemirror'
          }
          if (
            id.includes('@tiptap/extension-collaboration')
            || id.includes('@tiptap/extension-character-count')
            || id.includes('@tiptap/extension-drag-handle')
          ) {
            return 'vendor-tiptap-collab'
          }
          if (
            id.includes('@tiptap/extension-image')
            || id.includes('@tiptap/extension-youtube')
          ) {
            return 'vendor-tiptap-media'
          }
          if (id.includes('@tiptap/extension-emoji')) {
            return 'vendor-tiptap-emoji'
          }
          if (id.includes('@tiptap/extension-mathematics')) {
            return 'vendor-tiptap-math'
          }
          if (id.includes('@tiptap/extension-table')) {
            return 'vendor-tiptap-table'
          }
          if (id.includes('@tiptap/extension-') || id.includes('@tiptap/starter-kit')) {
            return 'vendor-tiptap-format'
          }
          if (id.includes('@tiptap')) {
            return 'vendor-tiptap-core'
          }
          if (id.includes('yjs') || id.includes('y-prosemirror') || id.includes('y-protocols') || id.includes('@hocuspocus')) {
            return 'vendor-collaboration'
          }
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'vendor-antd'
          }
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand')) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:1234',
        ws: true,
      },
    },
  },
})
