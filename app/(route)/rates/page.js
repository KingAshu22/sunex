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
import "handsontable/dist/handsontable.full.min.css"

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

  // Fetch rates on mount
  useEffect(() => {
    fetchRates()
  }, [])

  // When selectedRateId or rates change, update selectedRate, zoneKeys, and hotData
  useEffect(() => {
    if (selectedRateId && rates.length > 0) {
      // Always compare as string
      const found = rates.find((r) => String(r._id?.$oid) === String(selectedRateId))
      setSelectedRate(found)
      if (found) {
        // Get all unique zone keys (except "kg")
        const keys = new Set()
        found.rates.forEach((row) => {
          Object.keys(row).forEach((k) => {
            if (k !== "kg") keys.add(k)
          })
        })
        const zoneArr = Array.from(keys)
        setZoneKeys(zoneArr)
        // Prepare data for Handsontable: [ [kg, zone1, zone2, ...], ... ]
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
      const response = await fetch("/api/rates")
      const data = await response.json()
      setRates(data)
    } catch (error) {
      console.error("Error fetching rates:", error)
    } finally {
      setLoading(false)
    }
  }

  // Save all changes
  async function handleSaveAll() {
    if (!selectedRate) return
    // Convert hotData back to array of objects
    const newRates = hotData.map((rowArr) => {
      const obj = { kg: rowArr[0] }
      zoneKeys.forEach((zone, i) => {
        obj[zone] = rowArr[i + 1] === "" ? undefined : Number(rowArr[i + 1])
      })
      return obj
    })
    try {
      await fetch(`/api/rates/${selectedRate._id.$oid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedRate, rates: newRates }),
      })
      await fetchRates()
      alert("Rates saved!")
    } catch (error) {
      alert("Error saving rates")
    }
  }

  // Filtered rates for search
  const filteredRates = useMemo(() => {
    if (!serviceSearch.trim()) return rates
    return rates.filter(
      (rate) =>
        rate.originalName.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        rate.service.toLowerCase().includes(serviceSearch.toLowerCase())
    )
  }, [serviceSearch, rates])

  // CreateRateModal and ZonesModal with robust key fixes

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
        fetchRates()
        setIsCreateModalOpen(false)
        setNewRate({ type: "", service: "", originalName: "", rates: [], zones: [] })
      } catch (error) {
        console.error("Error creating rate:", error)
      }
    }

    return (
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Rate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={newRate.type}
                  onChange={(e) => setNewRate({ ...newRate, type: e.target.value })}
                  placeholder="e.g., dhl"
                />
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Input
                  id="service"
                  value={newRate.service}
                  onChange={(e) => setNewRate({ ...newRate, service: e.target.value })}
                  placeholder="e.g., SUNEX-D"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="originalName">Original Name</Label>
              <Input
                id="originalName"
                value={newRate.originalName}
                onChange={(e) => setNewRate({ ...newRate, originalName: e.target.value })}
                placeholder="e.g., DHL"
              />
            </div>
            <Button onClick={handleCreateRate} className="w-full">
              Create Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const ZonesModal = () => (
    <Dialog open={isViewZonesOpen} onOpenChange={setIsViewZonesOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zone Countries</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {selectedRate?.zones.map((zone, idx) => (
            <Card key={`zone-${String(zone.zone)}-${idx}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Zone {zone.zone}</CardTitle>
                {zone.extraCharges && <Badge variant="secondary">Extra Charge: ${zone.extraCharges.Charge}</Badge>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {zone.countries.map((country, cidx) => (
                    <Badge key={`country-${String(zone.zone)}-${cidx}`} variant="outline">
                      {country}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading rates...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Shipping Rates Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Rate
          </Button>
          {selectedRate && (
            <Button variant="outline" onClick={() => setIsViewZonesOpen(true)} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Zones
            </Button>
          )}
        </div>
      </div>

      {/* Service Search/Select */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Label htmlFor="service-search" className="font-semibold">
              Search or Select Service:
            </Label>
            <Input
              id="service-search"
              placeholder="Type to search service name..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={selectedRateId}
              onValueChange={setSelectedRateId}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {filteredRates.length === 0 && (
                  <SelectItem value="" disabled>
                    No services found
                  </SelectItem>
                )}
                {filteredRates.map((rate, idx) => (
                  <SelectItem key={`rate-${rate._id?.$oid || "noid"}-${idx}`} value={String(rate._id.$oid)}>
                    {rate.originalName} - {rate.service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Only show rates table if a service is selected */}
      {!selectedRate ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Please search and select a service to view and edit rates.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">
                  {selectedRate.originalName} - {selectedRate.service}
                </CardTitle>
                <p className="text-muted-foreground">Type: {selectedRate.type}</p>
              </div>
              <Badge variant="secondary">{selectedRate.rates.length} weight tiers</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <HotTable
                ref={hotTableRef}
                key={selectedRateId || "no-rate"} // Remounts on service change
                data={hotData}
                colHeaders={["Weight (kg)", ...zoneKeys]}
                rowHeaders={true}
                width="100%"
                height="auto"
                stretchH="all"
                manualColumnResize={true}
                manualRowResize={true}
                licenseKey="non-commercial-and-evaluation"
                contextMenu={true}
                copyPaste={true}
                undo={true}
                redo={true}
                afterChange={(changes, source) => {
                  if (changes && source !== "loadData") {
                    setHotData((prev) => {
                      const updated = prev.map((row) => [...row])
                      changes.forEach(([rowIdx, colIdx, oldVal, newVal]) => {
                        updated[rowIdx][colIdx] = newVal
                      })
                      return updated
                    })
                  }
                }}
                cells={(row, col) => {
                  // Make all cells editable except the first column (kg)
                  if (col === 0) {
                    return { readOnly: true }
                  }
                }}
              />
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveAll}>Save All Changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateRateModal />
      <ZonesModal />
    </div>
  )
}