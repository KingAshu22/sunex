"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye } from "lucide-react"
import { HotTable } from "@handsontable/react"
import 'handsontable/styles/handsontable.css';
import 'handsontable/styles/ht-theme-main.css';

export default function RatesPage() {
  const [rates, setRates] = useState([])
  const [selectedRateId, setSelectedRateId] = useState("")
  const [selectedRate, setSelectedRate] = useState(null)
  const [hotData, setHotData] = useState([])
  const [zoneKeys, setZoneKeys] = useState([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewZonesOpen, setIsViewZonesOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [serviceSearch, setServiceSearch] = useState("")
  const hotTableRef = useRef(null)

  const getId = (id) => (typeof id === "string" ? id : id?.$oid || "")

  useEffect(() => {
    fetchRates()
  }, [])

  useEffect(() => {
    if (selectedRateId && rates.length > 0) {
      const found = rates.find((r) => getId(r._id) === selectedRateId)
      setSelectedRate(found)
      if (found) {
        const keys = new Set()
        found.rates.forEach((row) => {
          Object.keys(row).forEach((k) => {
            if (k !== "kg") keys.add(k)
          })
        })
        const zoneArr = Array.from(keys)
        setZoneKeys(zoneArr)
        const data = found.rates.map((row) => [
          row.kg,
          ...zoneArr.map((zone) => row[zone] ?? "")
        ])
        setHotData(data)
      } else {
        setZoneKeys([])
        setHotData([])
      }
    } else {
      setSelectedRate(null)
      setZoneKeys([])
      setHotData([])
    }
  }, [selectedRateId, rates])

  const fetchRates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/rates")
      const data = await res.json()
      setRates(data)
    } catch (err) {
      console.error("Error fetching rates:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    if (!selectedRate) return
    const newRates = hotData.map((rowArr) => {
      const obj = { kg: rowArr[0] }
      zoneKeys.forEach((zone, i) => {
        obj[zone] = rowArr[i + 1] === "" ? undefined : Number(rowArr[i + 1])
      })
      return obj
    })

    try {
      const id = getId(selectedRate._id)
      const res = await fetch(`/api/rates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates: newRates }),
      })

      if (!res.ok) throw new Error("Failed to update")

      setRates((prev) =>
        prev.map((r) =>
          getId(r._id) === id ? { ...r, rates: newRates } : r
        )
      )
      setSelectedRate((prev) => ({ ...prev, rates: newRates }))
      alert("Rates saved!")
    } catch (err) {
      alert("Error saving rates")
      console.error(err)
    }
  }

  const filteredRates = useMemo(() => {
    if (!serviceSearch.trim()) return rates
    return rates.filter((rate) =>
      (rate.originalName + " " + rate.service)
        .toLowerCase()
        .includes(serviceSearch.toLowerCase())
    )
  }, [serviceSearch, rates])

  const CreateRateModal = () => {
    const [newRate, setNewRate] = useState({
      type: "",
      service: "",
      originalName: "",
      rates: [],
      zones: [],
    })

    const handleCreateRate = async () => {
      try {
        await fetch("/api/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRate),
        })
        await fetchRates()
        setIsCreateModalOpen(false)
      } catch (error) {
        console.error("Error creating rate:", error)
      }
    }

    return (
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl z-[1050]">
          <DialogHeader>
            <DialogTitle>Create New Rate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Input id="type" value={newRate.type} onChange={(e) => setNewRate({ ...newRate, type: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Input id="service" value={newRate.service} onChange={(e) => setNewRate({ ...newRate, service: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="originalName">Original Name</Label>
              <Input id="originalName" value={newRate.originalName} onChange={(e) => setNewRate({ ...newRate, originalName: e.target.value })} />
            </div>
            <Button onClick={handleCreateRate} className="w-full">Create Rate</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const ZonesModal = () => (
    <Dialog open={isViewZonesOpen} onOpenChange={setIsViewZonesOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[1050]">
        <DialogHeader>
          <DialogTitle>Zone Countries</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <table className="w-full text-left border mt-4">
            <thead>
              <tr>
                <th className="border p-2">Zone</th>
                <th className="border p-2">Country</th>
              </tr>
            </thead>
            <tbody>
              {selectedRate?.zones?.flatMap((zone, zIdx) =>
                zone.countries.map((country, cIdx) => (
                  <tr key={`zone-${zIdx}-country-${cIdx}`}>
                    <td className="border p-2">{zone.zone}</td>
                    <td className="border p-2">{country}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">Loading rates...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Shipping Rates Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Rate
          </Button>
          {selectedRate && (
            <Button onClick={() => setIsViewZonesOpen(true)} variant="outline" className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> View Zones
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="py-6 flex flex-wrap items-center gap-4">
          <Label className="font-semibold">Search or Select Service:</Label>
          <Input
            placeholder="Type to search service name..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={selectedRateId} onValueChange={setSelectedRateId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {filteredRates.map((rate, idx) => (
                <SelectItem key={idx} value={getId(rate._id)}>
                  {rate.originalName} - {rate.service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{selectedRate.originalName} - {selectedRate.service}</CardTitle>
          </CardHeader>
          <CardContent>
            <HotTable
              ref={hotTableRef}
              key={selectedRateId}
              themeName="ht-theme-main"
              data={hotData}
              colHeaders={["kg", ...zoneKeys]}
              colWidths="80"
              rowHeaders={true}
              rowHeights="30"
              width="100%"
              height="auto"
              stretchH="all"
              fixedColumnsStart={1}
              customBorders={true}
              dropdownMenu={true}
              filter={true}
              multiColumnSorting={true}
              filters={true}
              manualRowMove={true}
              manualColumnResize
              manualRowResize
              licenseKey="non-commercial-and-evaluation"
              contextMenu
              copyPaste
              undo
              redo
              afterChange={(changes, source) => {
                if (changes && source !== "loadData") {
                  setHotData((prev) => {
                    const updated = [...prev]
                    changes.forEach(([row, col, , newVal]) => {
                      updated[row][col] = newVal
                    })
                    return updated
                  })
                }
              }}
              cells={(row, col) => {
                if (col === 0) return { readOnly: true }
              }}
            />
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveAll}>Save All Changes</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Please search and select a service to view and edit rates.
          </CardContent>
        </Card>
      )}

      <CreateRateModal />
      <ZonesModal />
    </div>
  )
}
