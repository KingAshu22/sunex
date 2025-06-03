"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Save, X, Eye } from "lucide-react"

export default function RatesPage() {
  const [rates, setRates] = useState([])
  const [selectedRate, setSelectedRate] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewZonesOpen, setIsViewZonesOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    try {
      const response = await fetch("/api/rates")
      const data = await response.json()
      setRates(data)
      if (data.length > 0) {
        setSelectedRate(data[0])
      }
    } catch (error) {
      console.error("Error fetching rates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCellEdit = (rowIndex, zone) => {
    setEditingCell(`${rowIndex}-${zone}`)
    setEditValue(selectedRate.rates[rowIndex][zone] || "")
  }

  const handleCellSave = async (rowIndex, zone) => {
    const updatedRates = [...selectedRate.rates]
    updatedRates[rowIndex][zone] = Number.parseFloat(editValue) || 0

    const updatedRate = { ...selectedRate, rates: updatedRates }
    setSelectedRate(updatedRate)

    // Save to database
    try {
      await fetch(`/api/rates/${selectedRate._id.$oid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRate),
      })
    } catch (error) {
      console.error("Error saving rate:", error)
    }

    setEditingCell(null)
    setEditValue("")
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue("")
  }

  const getZoneNumbers = () => {
    if (!selectedRate || !selectedRate.rates.length) return []
    const firstRate = selectedRate.rates[0]
    return Object.keys(firstRate)
      .filter((key) => key !== "kg")
      .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
  }

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
          {selectedRate?.zones.map((zone) => (
            <Card key={zone.zone}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Zone {zone.zone}</CardTitle>
                {zone.extraCharges && <Badge variant="secondary">Extra Charge: ${zone.extraCharges.Charge}</Badge>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {zone.countries.map((country) => (
                    <Badge key={country} variant="outline">
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

      {rates.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">No rates found</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>Create Your First Rate</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={selectedRate?._id.$oid}
          onValueChange={(value) => {
            const rate = rates.find((r) => r._id.$oid === value)
            setSelectedRate(rate)
          }}
        >
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rates.map((rate) => (
              <TabsTrigger key={rate._id.$oid} value={rate._id.$oid} className="text-xs sm:text-sm">
                {rate.originalName} - {rate.service}
              </TabsTrigger>
            ))}
          </TabsList>

          {rates.map((rate) => (
            <TabsContent key={rate._id.$oid} value={rate._id.$oid}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-xl">
                        {rate.originalName} - {rate.service}
                      </CardTitle>
                      <p className="text-muted-foreground">Type: {rate.type}</p>
                    </div>
                    <Badge variant="secondary">{rate.rates.length} weight tiers</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left font-semibold min-w-[80px]">
                            Weight (kg)
                          </th>
                          {getZoneNumbers().map((zone) => (
                            <th
                              key={zone}
                              className="border border-gray-300 p-2 text-center font-semibold min-w-[100px]"
                            >
                              Zone {zone}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rate.rates.map((rateRow, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-2 font-medium bg-gray-50">{rateRow.kg}</td>
                            {getZoneNumbers().map((zone) => (
                              <td key={zone} className="border border-gray-300 p-1">
                                {editingCell === `${rowIndex}-${zone}` ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="h-8 text-sm"
                                      type="number"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCellSave(rowIndex, zone)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCellCancel}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-gray-100"
                                    onClick={() => handleCellEdit(rowIndex, zone)}
                                  >
                                    <span className="text-sm">{rateRow[zone] || 0}</span>
                                    <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <CreateRateModal />
      <ZonesModal />
    </div>
  )
}
