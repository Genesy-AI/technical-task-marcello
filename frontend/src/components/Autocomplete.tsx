import { FC, useEffect, useMemo, useRef, useState } from 'react'

interface AutocompleteProps {
  options: string[]
  onSelect: (value: string) => void
  placeholder?: string
  label?: string
}

export const Autocomplete: FC<AutocompleteProps> = ({ options, onSelect, placeholder, label }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  )

  // Keep the highlighted option in range whenever the filtered list changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectOption = (option: string) => {
    onSelect(option)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="autocomplete-options"
        aria-autocomplete="list"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {isOpen && (
        <ul
          id="autocomplete-options"
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matching fields</li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(option)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  index === highlightedIndex ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {`{${option}}`}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
