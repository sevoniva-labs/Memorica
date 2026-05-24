import { createContext, useContext } from 'react'
import type { DocumentItem } from '../api/client'

interface SidebarContextType {
  recentDocs: DocumentItem[]
  refreshRecentDocs: () => void
  updateDocTitle: (id: string, title: string) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  query: string
  setQuery: (v: string) => void
}

export const SidebarContext = createContext<SidebarContextType>({
  recentDocs: [],
  refreshRecentDocs: () => {},
  updateDocTitle: () => {},
  collapsed: false,
  setCollapsed: () => {},
  query: '',
  setQuery: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}
