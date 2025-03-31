
import React, { useState, useRef, useEffect } from 'react'
import { Search, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { searchUsers } from '@/services/profileService'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/components/ui/use-toast'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { Profile } from '@/lib/supabase'

const UserSearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  useOnClickOutside(searchRef, () => setIsOpen(false))

  // Handle search when input changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      try {
        const results = await searchUsers(debouncedSearchTerm, 8)
        setSearchResults(results)
        setIsOpen(results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
        toast({
          title: 'Search failed',
          description: 'Could not complete the search. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearchTerm, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.trim().length > 0) {
      setIsOpen(true)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleSelectUser = (username: string) => {
    setSearchTerm('')
    setSearchResults([])
    setIsOpen(false)
    navigate(`/profile/${username}`)
  }

  const handleFocus = () => {
    if (searchResults.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-xs">
      <div className="bg-crypto-black rounded-full border border-crypto-gray flex items-center px-3 py-1.5 w-full">
        <Search className="w-4 h-4 text-crypto-lightgray mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search users..."
          className="bg-transparent border-none text-sm focus:outline-none w-full text-white"
          aria-label="Search users"
        />
        {searchTerm && (
          <button 
            onClick={handleClearSearch}
            className="text-crypto-lightgray hover:text-white p-1"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-crypto-darkgray border border-crypto-gray rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto crypto-scrollbar">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="crypto-loader">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-crypto-gray/20 transition-colors text-left"
                  onClick={() => handleSelectUser(user.username || '')}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={user.display_name || ''} />
                    ) : (
                      <AvatarFallback className="bg-crypto-gray text-white text-xs">
                        {user.display_name?.substring(0, 2).toUpperCase() || user.username?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="font-medium text-white truncate">{user.display_name || user.username}</p>
                    {user.username && (
                      <p className="text-xs text-crypto-lightgray truncate">@{user.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-crypto-lightgray">
              <User className="w-5 h-5 mx-auto mb-2 opacity-60" />
              <p>No users found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserSearchBar
