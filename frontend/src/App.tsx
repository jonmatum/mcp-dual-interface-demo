import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import MDEditor from '@uiw/react-md-editor'
import { Dialog, Transition, Listbox } from '@headlessui/react'
import { Fragment } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Tooltip } from 'react-tooltip'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'

interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  created_at: string
}

type FilterType = 'all' | 'active' | 'completed'
type SortType = 'date' | 'title' | 'status'

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [fullWidth, setFullWidth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')

  const API_URL = 'http://localhost:8002'

  // Auto-save draft to localStorage
  useEffect(() => {
    if (title || description) {
      localStorage.setItem('todo-draft', JSON.stringify({ title, description }))
    }
  }, [title, description])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('todo-draft')
    if (draft) {
      const { title: draftTitle, description: draftDescription } = JSON.parse(draft)
      setTitle(draftTitle || '')
      setDescription(draftDescription || '')
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setShowCreateModal(true)
      }
      if (e.key === 'Escape') {
        setShowCreateModal(false)
        setViewingTodo(null)
        cancelEdit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/todos`)
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      setTodos(data)
    } catch (error) {
      toast.error('Failed to load todos')
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  const createTodo = async () => {
    if (!title.trim()) return
    
    const loadingToast = toast.loading('Creating todo...')
    try {
      const res = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || '' })
      })
      if (!res.ok) throw new Error('Failed to create todo')
      
      setTitle('')
      setDescription('')
      setShowCreateModal(false)
      localStorage.removeItem('todo-draft')
      await fetchTodos()
      toast.success('Todo created!', { id: loadingToast })
    } catch (error) {
      toast.error('Failed to create todo', { id: loadingToast })
      console.error('Error creating todo:', error)
    }
  }

  const saveEdit = async (id: string) => {
    const loadingToast = toast.loading('Saving changes...')
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription })
      })
      if (!res.ok) throw new Error('Failed to update todo')
      
      setEditingId(null)
      await fetchTodos()
      toast.success('Todo updated!', { id: loadingToast })
    } catch (error) {
      toast.error('Failed to update todo', { id: loadingToast })
      console.error('Error updating todo:', error)
    }
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    // Optimistic update
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !completed } : todo
    ))
    
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      if (!res.ok) throw new Error('Failed to toggle todo')
      
      toast.success(completed ? 'Todo marked as active' : 'Todo completed!')
    } catch (error) {
      // Revert optimistic update
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed } : todo
      ))
      toast.error('Failed to update todo')
      console.error('Error updating todo:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    if (!confirm('Delete this todo?')) return
    
    const loadingToast = toast.loading('Deleting todo...')
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete todo')
      
      await fetchTodos()
      toast.success('Todo deleted!', { id: loadingToast })
    } catch (error) {
      toast.error('Failed to delete todo', { id: loadingToast })
      console.error('Error deleting todo:', error)
    }
  }

  const deleteCompleted = async () => {
    const completedTodos = todos.filter(todo => todo.completed)
    if (completedTodos.length === 0) {
      toast.error('No completed todos to delete')
      return
    }
    
    if (!confirm(`Delete ${completedTodos.length} completed todos?`)) return
    
    const loadingToast = toast.loading('Deleting completed todos...')
    try {
      await Promise.all(
        completedTodos.map(todo => 
          fetch(`${API_URL}/todos/${todo.id}`, { method: 'DELETE' })
        )
      )
      await fetchTodos()
      toast.success(`Deleted ${completedTodos.length} todos!`, { id: loadingToast })
    } catch (error) {
      toast.error('Failed to delete todos', { id: loadingToast })
      console.error('Error deleting todos:', error)
    }
  }

  // Filter and sort todos
  const filteredAndSortedTodos = todos
    .filter(todo => {
      const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           todo.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === 'all' || 
                           (filter === 'active' && !todo.completed) ||
                           (filter === 'completed' && todo.completed)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'status':
          return Number(a.completed) - Number(b.completed)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    const isFullWidth = localStorage.getItem('fullWidth') === 'true'
    setDarkMode(isDark)
    setFullWidth(isFullWidth)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
    fetchTodos()
  }, [fetchTodos])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleFullWidth = () => {
    const newFullWidth = !fullWidth
    setFullWidth(newFullWidth)
    localStorage.setItem('fullWidth', newFullWidth.toString())
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
  }

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: '!bg-gh-canvas-overlay !text-gh-fg-default !border !border-gh-border-default !shadow-lg',
          duration: 3000,
          success: {
            className: '!bg-gh-success-subtle !text-gh-success-fg !border !border-gh-success-muted',
          },
          error: {
            className: '!bg-gh-danger-subtle !text-gh-danger-fg !border !border-gh-danger-muted',
          },
          loading: {
            className: '!bg-gh-accent-subtle !text-gh-accent-fg !border !border-gh-accent-muted',
          },
        }}
      />
      
      <Tooltip id="layout-tooltip" />
      <Tooltip id="theme-tooltip" />
      
      <div className="min-h-screen bg-gh-canvas-default dark:bg-gh-canvas-default transition-colors">
        <div className={`min-h-screen flex flex-col ${fullWidth ? 'max-w-none px-2 sm:px-4 lg:px-6' : 'max-w-7xl mx-auto'} p-2 sm:p-4 lg:p-6`}>
        {/* Header */}
        <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gh-fg-default">
                  Todo App
                </h1>
                <p className="text-gh-fg-muted text-sm mt-2">
                  {stats.total} total • {stats.active} active • {stats.completed} completed
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={toggleFullWidth}
                  data-tooltip-id="layout-tooltip"
                  data-tooltip-content={fullWidth ? "Switch to boxed layout" : "Switch to full width layout"}
                  className={`p-2 rounded-md transition-colors ${
                    fullWidth 
                      ? 'bg-gh-accent-emphasis text-white' 
                      : 'text-gh-fg-muted hover:text-gh-fg-default hover:bg-gh-canvas-inset'
                  }`}
                >
                  {fullWidth ? (
                    <ArrowsPointingInIcon className="w-4 h-4" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={toggleDarkMode}
                  data-tooltip-id="theme-tooltip"
                  data-tooltip-content={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                  className={`p-2 rounded-md transition-colors ${
                    darkMode 
                      ? 'bg-gh-accent-emphasis text-white' 
                      : 'text-gh-fg-muted hover:text-gh-fg-default hover:bg-gh-canvas-inset'
                  }`}
                >
                  {darkMode ? (
                    <MoonIcon className="w-4 h-4" />
                  ) : (
                    <SunIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gh-fg-muted" />
              <input
                type="text"
                placeholder="Search todos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gh-border-default bg-gh-canvas-default text-gh-fg-default placeholder-gh-fg-muted focus:ring-1 focus:ring-gh-accent-emphasis focus:border-gh-accent-emphasis focus:outline-none rounded-md text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gh-fg-muted hover:text-gh-fg-default transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Listbox value={filter} onChange={setFilter}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-gh-canvas-default py-2 pl-3 pr-10 text-left border border-gh-border-default focus:outline-none focus:ring-1 focus:ring-gh-accent-emphasis text-sm min-w-[140px]">
                    <span className="block truncate text-gh-fg-default">
                      {filter === 'all' ? `All (${stats.total})` :
                       filter === 'active' ? `Active (${stats.active})` :
                       `Completed (${stats.completed})`}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDownIcon className="h-4 w-4 text-gh-fg-muted" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gh-canvas-overlay py-1 shadow-lg border border-gh-border-default focus:outline-none text-sm">
                      <Listbox.Option
                        value="all"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              All ({stats.total})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                      <Listbox.Option
                        value="active"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Active ({stats.active})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                      <Listbox.Option
                        value="completed"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Completed ({stats.completed})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
              
              <Listbox value={sortBy} onChange={setSortBy}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-gh-canvas-default py-2 pl-3 pr-10 text-left border border-gh-border-default focus:outline-none focus:ring-1 focus:ring-gh-accent-emphasis text-sm min-w-[140px]">
                    <span className="block truncate text-gh-fg-default">
                      {sortBy === 'date' ? 'Sort by Date' :
                       sortBy === 'title' ? 'Sort by Title' :
                       'Sort by Status'}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDownIcon className="h-4 w-4 text-gh-fg-muted" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gh-canvas-overlay py-1 shadow-lg border border-gh-border-default focus:outline-none text-sm">
                      <Listbox.Option
                        value="date"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Sort by Date
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                      <Listbox.Option
                        value="title"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Sort by Title
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                      <Listbox.Option
                        value="status"
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-3 pr-9 ${
                            active ? 'bg-gh-accent-subtle text-gh-accent-fg' : 'text-gh-fg-default'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Sort by Status
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gh-accent-fg">
                                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="flex-1 bg-gh-canvas-subtle border border-gh-border-default rounded-xl shadow-sm p-3 sm:p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gh-fg-default">
              {searchTerm ? `Search Results (${filteredAndSortedTodos.length})` : 
               filter === 'all' ? `All Todos (${filteredAndSortedTodos.length})` :
               filter === 'active' ? `Active Todos (${filteredAndSortedTodos.length})` :
               `Completed Todos (${filteredAndSortedTodos.length})`}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gh-accent-emphasis"></div>
              )}
              {stats.completed > 0 && (
                <button
                  onClick={deleteCompleted}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gh-danger-emphasis hover:bg-gh-danger-emphasis/90 text-white rounded-md transition-colors text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Clear Completed</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gh-btn-primary-bg hover:bg-gh-btn-primary-hover-bg text-gh-btn-primary-text px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium transition-colors flex items-center gap-1 sm:gap-2 border border-gh-btn-primary-border text-xs sm:text-sm"
              >
                <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Todo</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
          
          <div className="h-full overflow-y-auto space-y-3 pr-2">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gh-border-default rounded-lg p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gh-neutral-muted rounded mt-1"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gh-neutral-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gh-neutral-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredAndSortedTodos.length === 0 ? (
              <div className="text-center py-12">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-12 h-12 mx-auto mb-4 bg-gh-neutral-muted hover:bg-gh-accent-subtle rounded-full flex items-center justify-center transition-colors group"
                >
                  {searchTerm ? (
                    <MagnifyingGlassIcon className="w-6 h-6 text-gh-fg-muted group-hover:text-gh-accent-fg" />
                  ) : (
                    <PlusIcon className="w-6 h-6 text-gh-fg-muted group-hover:text-gh-accent-fg" />
                  )}
                </button>
                <p className="text-gh-fg-muted">
                  {searchTerm ? 'No todos match your search' : 
                   filter === 'active' ? 'No active todos' :
                   filter === 'completed' ? 'No completed todos' :
                   'No todos yet. Create your first one!'}
                </p>
              </div>
            ) : (
              filteredAndSortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                    todo.completed 
                      ? 'bg-gh-canvas-default border-gh-border-muted opacity-60 hover:border-gh-border-default hover:bg-gh-canvas-subtle' 
                      : 'bg-gh-canvas-default border-gh-border-default hover:border-gh-accent-emphasis hover:bg-gh-canvas-subtle hover:shadow-gh-accent-muted'
                  }`}
                >
                  {editingId === todo.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gh-border-default rounded-md bg-gh-canvas-default text-gh-fg-default focus:ring-1 focus:ring-gh-accent-emphasis focus:border-gh-accent-emphasis focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.metaKey) {
                            saveEdit(todo.id)
                          }
                        }}
                      />
                      <div data-color-mode={darkMode ? "dark" : "light"}>
                        <MDEditor
                          value={editDescription}
                          onChange={(val) => setEditDescription(val || '')}
                          preview="live"
                          height={200}
                          visibleDragbar={false}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(todo.id)}
                          className="px-3 py-1.5 bg-gh-success-emphasis hover:bg-gh-success-emphasis/90 text-white rounded-md transition-colors flex items-center gap-1 text-sm"
                        >
                          <CheckIcon className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-gh-btn-bg hover:bg-gh-btn-hover-bg text-gh-btn-text border border-gh-btn-border rounded-md transition-colors flex items-center gap-1 text-sm"
                        >
                          <XMarkIcon className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id, todo.completed)}
                        className="w-4 h-4 mt-1 cursor-pointer accent-gh-accent-emphasis rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium cursor-pointer hover:text-gh-accent-fg transition-colors ${
                          todo.completed 
                            ? 'line-through text-gh-fg-muted' 
                            : 'text-gh-fg-default'
                        }`}
                            onClick={() => setViewingTodo(todo)}>
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <div className={`mt-1 cursor-pointer transition-colors ${
                            todo.completed 
                              ? 'text-gh-fg-muted' 
                              : 'text-gh-fg-muted'
                          }`}
                               onClick={() => setViewingTodo(todo)}>
                            <p className="text-sm line-clamp-2">
                              {todo.description.replace(/[#*`_~]/g, '').substring(0, 100)}
                              {todo.description.length > 100 ? '...' : ''}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gh-fg-muted mt-2">
                          {new Date(todo.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingTodo(todo)}
                          className="p-2 text-gh-fg-muted hover:text-gh-accent-fg hover:bg-gh-accent-subtle rounded-md transition-colors"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(todo)}
                          className="p-2 text-gh-fg-muted hover:text-gh-attention-fg hover:bg-gh-attention-subtle rounded-md transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-2 text-gh-fg-muted hover:text-gh-danger-fg hover:bg-gh-danger-subtle rounded-md transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Transition appear show={showCreateModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowCreateModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gh-primer-canvas-backdrop" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-2 sm:p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl h-[85vh] sm:h-[90vh] transform overflow-hidden rounded-lg sm:rounded-xl bg-gh-canvas-default border border-gh-border-default shadow-xl transition-all flex flex-col">
                  <div className="p-3 sm:p-4 border-b border-gh-border-default flex justify-between items-center">
                    <Dialog.Title className="text-lg sm:text-xl font-semibold text-gh-fg-default">
                      Create New Todo
                    </Dialog.Title>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-gh-fg-muted hover:text-gh-fg-default transition-colors p-1 rounded-md hover:bg-gh-canvas-inset"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-col overflow-hidden">
                    <input
                      type="text"
                      placeholder="Task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gh-border-default rounded-md mb-3 text-sm sm:text-base text-gh-fg-default bg-gh-canvas-default placeholder-gh-fg-muted focus:ring-1 focus:ring-gh-accent-emphasis focus:border-gh-accent-emphasis focus:outline-none"
                    />
                    <div className="flex-1 overflow-hidden" data-color-mode={darkMode ? "dark" : "light"}>
                      <MDEditor
                        value={description}
                        onChange={(val) => setDescription(val || '')}
                        preview="live"
                        height="100%"
                        visibleDragbar={false}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                      <button
                        onClick={createTodo}
                        disabled={!title.trim()}
                        className="flex-1 bg-gh-btn-primary-bg hover:bg-gh-btn-primary-hover-bg text-gh-btn-primary-text py-2 sm:py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gh-btn-primary-border text-sm sm:text-base"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Create Todo
                      </button>
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-gh-btn-bg hover:bg-gh-btn-hover-bg text-gh-btn-text border border-gh-btn-border rounded-md transition-colors font-medium text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Modal */}
      <Transition appear show={!!viewingTodo} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setViewingTodo(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gh-primer-canvas-backdrop" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-2 sm:p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl max-h-[85vh] sm:max-h-[80vh] transform overflow-hidden rounded-lg sm:rounded-xl bg-gh-canvas-default border border-gh-border-default shadow-xl transition-all flex flex-col">
                  {viewingTodo && (
                    <>
                      <div className="p-3 sm:p-4 border-b border-gh-border-default flex justify-between items-center">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <input
                            type="checkbox"
                            checked={viewingTodo.completed}
                            onChange={() => {
                              toggleTodo(viewingTodo.id, viewingTodo.completed)
                              setViewingTodo({...viewingTodo, completed: !viewingTodo.completed})
                            }}
                            className="w-4 h-4 cursor-pointer accent-gh-accent-emphasis rounded"
                          />
                          <Dialog.Title className={`text-base sm:text-lg font-semibold ${
                            viewingTodo.completed 
                              ? 'line-through text-gh-fg-muted' 
                              : 'text-gh-fg-default'
                          }`}>
                            {viewingTodo.title}
                          </Dialog.Title>
                        </div>
                        <button
                          onClick={() => setViewingTodo(null)}
                          className="text-gh-fg-muted hover:text-gh-fg-default transition-colors p-1 rounded-md hover:bg-gh-canvas-inset"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                        {viewingTodo.description ? (
                          <div className={`prose prose-sm max-w-none ${viewingTodo.completed ? 'opacity-60' : ''}`}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({children}) => <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gh-fg-default border-b border-gh-border-muted pb-2">{children}</h1>,
                                h2: ({children}) => <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gh-fg-default border-b border-gh-border-muted pb-1">{children}</h2>,
                                h3: ({children}) => <h3 className="text-base sm:text-lg font-bold mb-2 text-gh-fg-default">{children}</h3>,
                                p: ({children}) => <p className="mb-2 sm:mb-3 text-gh-fg-default leading-relaxed text-sm sm:text-base">{children}</p>,
                                ul: ({children}) => <ul className="list-disc pl-4 sm:pl-6 mb-2 sm:mb-3 text-gh-fg-default text-sm sm:text-base">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal pl-4 sm:pl-6 mb-2 sm:mb-3 text-gh-fg-default text-sm sm:text-base">{children}</ol>,
                                li: ({children}) => <li className="mb-1 text-gh-fg-default">{children}</li>,
                                strong: ({children}) => <strong className="font-semibold text-gh-fg-default">{children}</strong>,
                                em: ({children}) => <em className="italic text-gh-fg-default">{children}</em>,
                                blockquote: ({children}) => <blockquote className="border-l-4 border-gh-border-default pl-3 sm:pl-4 my-3 sm:my-4 text-gh-fg-muted italic text-sm sm:text-base">{children}</blockquote>,
                                table: ({children}) => <div className="overflow-x-auto mb-3 sm:mb-4"><table className="min-w-full border border-gh-border-default rounded-md text-sm">{children}</table></div>,
                                thead: ({children}) => <thead className="bg-gh-canvas-subtle">{children}</thead>,
                                th: ({children}) => <th className="px-2 sm:px-3 py-1 sm:py-2 text-left text-gh-fg-default font-semibold border-b border-gh-border-default text-xs sm:text-sm">{children}</th>,
                                td: ({children}) => <td className="px-2 sm:px-3 py-1 sm:py-2 text-gh-fg-default border-b border-gh-border-muted text-xs sm:text-sm">{children}</td>,
                                code: ({node, className, children, ...props}: any) => {
                                  const match = /language-(\w+)/.exec(className || '')
                                  const isInline = !match
                                  return !isInline ? (
                                    <SyntaxHighlighter
                                      style={ghcolors as any}
                                      language={match[1]}
                                      PreTag="div"
                                      className="rounded-md border border-gh-border-default mb-3 sm:mb-4 text-xs sm:text-sm"
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className="bg-gh-neutral-muted px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm text-gh-fg-default font-mono" {...props}>
                                      {children}
                                    </code>
                                  )
                                },
                                pre: ({children}) => <div className="mb-3 sm:mb-4">{children}</div>,
                                a: ({children, href}) => <a href={href} className="text-gh-accent-fg hover:underline text-sm sm:text-base" target="_blank" rel="noopener noreferrer">{children}</a>,
                              }}
                            >
                              {viewingTodo.description}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-gh-fg-muted italic text-sm sm:text-base">No description</p>
                        )}
                        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gh-border-muted text-xs sm:text-sm text-gh-fg-muted">
                          Created: {new Date(viewingTodo.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 border-t border-gh-border-default flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => {
                            startEdit(viewingTodo)
                            setViewingTodo(null)
                          }}
                          className="px-3 sm:px-4 py-2 bg-gh-btn-primary-bg hover:bg-gh-btn-primary-hover-bg text-gh-btn-primary-text border border-gh-btn-primary-border rounded-md transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setViewingTodo(null)}
                          className="px-3 sm:px-4 py-2 bg-gh-btn-bg hover:bg-gh-btn-hover-bg text-gh-btn-text border border-gh-btn-border rounded-md transition-colors font-medium text-sm sm:text-base"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      </div>
    </>
  )
}

export default App
