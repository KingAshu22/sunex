"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ItemNameAutocomplete({ value, onChange, onHsnSelect, id, required }) {
    const [searchTerm, setSearchTerm] = useState(value || "")
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showResults, setShowResults] = useState(false)
    const inputRef = useRef(null)
    const resultsRef = useRef(null)

    // Update internal state when value prop changes
    useEffect(() => {
        if (value !== searchTerm) {
            setSearchTerm(value || "")
        }
    }, [value])

    // Search for HSN codes when search term changes
    useEffect(() => {
        const searchHsn = async () => {
            if (searchTerm.length < 4) {
                setResults([])
                return
            }

            setLoading(true)
            setError(null)

            try {
                const response = await axios.get(`/api/hsn?query=${encodeURIComponent(searchTerm)}`)

                if (Array.isArray(response.data)) {
                    setResults(response.data)
                } else {
                    console.error("Unexpected response format:", response.data)
                    setError("Received invalid data format from server")
                    setResults([])
                }
            } catch (error) {
                console.error("Error searching HSN codes:", error)
                setError(error.message || "Failed to search HSN codes")
                setResults([])
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(searchHsn, 300)
        return () => clearTimeout(debounce)
    }, [searchTerm])

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                resultsRef.current &&
                !resultsRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowResults(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (item) => {
        setSearchTerm(item.item)
        onChange(item.item)
        onHsnSelect(item)
        setShowResults(false)
    }

    const handleInputChange = (e) => {
        const newValue = e.target.value
        setSearchTerm(newValue)
        onChange(newValue)
        setShowResults(true)
    }

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                id={id}
                type="text"
                placeholder="Item Name"
                value={searchTerm}
                autoComplete="off"
                onChange={handleInputChange}
                onFocus={() => setShowResults(true)}
                required={required}
            />

            {showResults && (results.length > 0 || loading) && (
                <div
                    ref={resultsRef}
                    className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                    {loading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            {searchTerm.length < 4 ? "Type at least 4 characters to search" : "No HSN codes found"}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {results.map((item) => (
                                <div
                                    key={item._id || item.code}
                                    className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                    onClick={() => handleSelect(item)}
                                >
                                    <span className="text-[10px] truncate">{item.item}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{item.code}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
