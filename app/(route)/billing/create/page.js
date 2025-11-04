"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Save, Package, Loader2, ChevronDown, Check, ChevronRight, Eye } from "lucide-react"
import isAdminAuth from "@/lib/isAdminAuth"

function BillingCreatePage() {
  // State Management
  const [awbs, setAwbs] = useState([])
  const [filteredAwbs, setFilteredAwbs] = useState([])
  const [selectedAwbs, setSelectedAwbs] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTrackingNumber, setSearchTrackingNumber] = useState("")
  const [searchCountry, setSearchCountry] = useState("")

  // Client/Franchise Selection
  const [clients, setClients] = useState([])
  const [franchises, setFranchises] = useState([])
  const [clientFranchiseList, setClientFranchiseList] = useState([])
  const [clientFranchiseSearch, setClientFranchiseSearch] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClientFranchise, setSelectedClientFranchise] = useState(null)

  // Billing Info
  const [billingInfo, setBillingInfo] = useState({
    name: "",
    address: "",
    gst: "",
    isEditable: true,
  })

  // Rate Settings
  const [rateSource, setRateSource] = useState("awb")
  const [availableRates, setAvailableRates] = useState([])
  const [selectedRateType, setSelectedRateType] = useState("")
  const [loadingRates, setLoadingRates] = useState(false)
  const [rateApiErrors, setRateApiErrors] = useState([])

  // Manual Rates
  const [manualRates, setManualRates] = useState([])
  const [rateSettings, setRateSettings] = useState({
    includeGST: true,
    cgst: 9,
    sgst: 9,
    igst: 18,
    fuelCharge: 0,
    fuelChargePercent: 0,
  })

  // Totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    fuelCharges: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    total: 0,
    paid: 0,
    balance: 0,
  })

  // UI States
  const [loading, setLoading] = useState(false)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const invoicePdfRef = useState(null)

  // Fetch data on component mount
  useEffect(() => {
    fetchAWBs()
    fetchClients()
    fetchFranchises()
    fetchAvailableRates()
  }, [])

  // Update filtered AWBs when filters change
  useEffect(() => {
    applyFilters()
  }, [awbs, startDate, endDate, searchTrackingNumber, searchCountry, selectedClientFranchise])

  // Update selected AWBs when selectAll changes
  useEffect(() => {
    if (selectAll) {
      setSelectedAwbs(filteredAwbs.map((awb) => awb._id))
    } else {
      setSelectedAwbs([])
    }
  }, [selectAll, filteredAwbs])

  // Calculate totals when selected AWBs or rates change
  useEffect(() => {
    calculateTotals()
  }, [selectedAwbs, manualRates, rateSettings])

  // Filter client/franchise list for dropdown
  const filteredClientFranchiseList = useMemo(() => {
    if (!clientFranchiseSearch) return clientFranchiseList
    return clientFranchiseList.filter(
      (item) =>
        item.name.toLowerCase().includes(clientFranchiseSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(clientFranchiseSearch.toLowerCase()),
    )
  }, [clientFranchiseList, clientFranchiseSearch])

  // API Calls
  const fetchAWBs = async () => {
    try {
      const response = await fetch("/api/awb")
      const data = await response.json()
      setAwbs(data)
    } catch (error) {
      console.error("Error fetching AWBs:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/franchises")
      const data = await response.json()
      setFranchises(data)
    } catch (error) {
      console.error("Error fetching franchises:", error)
    }
  }

  const fetchAvailableRates = async () => {
    try {
      const response = await fetch("/api/rates")
      const data = await response.json()
      setAvailableRates(data)
    } catch (error) {
      console.error("Error fetching rates:", error)
    }
  }

  // Update combined client/franchise list
  useEffect(() => {
    const combined = [
      ...clients.map((c) => ({ ...c, type: "client", code: c.code || c._id })),
      ...franchises.map((f) => ({ ...f, type: "franchise", code: f.code || f._id })),
    ]
    setClientFranchiseList(combined)
  }, [clients, franchises])

  // Handle client/franchise selection
  const handleSelectClientFranchise = (item) => {
    setSelectedClientFranchise(item)
    setShowClientDropdown(false)

    // Update billing info
    setBillingInfo({
      name: item.name || item.companyName || "",
      address: item.address || "",
      gst: item.gstNo || item.gst || "",
      isEditable: true,
    })

    // Filter AWBs by refCode
    const filtered = awbs.filter((awb) => awb.refCode === item.code)
    setClientFranchiseSearch("")
  }

  const fetchRateFromAPI = async (rateType, weight, country) => {
    try {
      const params = new URLSearchParams({
        type: rateType,
        weight: weight.toString(),
        country: country,
        profitPercent: "0",
      })

      const response = await fetch(`/api/rate?${params}`)
      if (!response.ok) throw new Error(`Failed to fetch rate for ${country}`)

      const data = await response.json()
      return data.rate || 0
    } catch (error) {
      console.error("Error fetching rate:", error)
      return null
    }
  }

  const fetchRatesForAWBs = async (awbList) => {
    if (!selectedRateType) {
      setRateApiErrors(["Please select a rate type"])
      return
    }

    setLoadingRates(true)
    setRateApiErrors([])
    const errors = []

    const updatedRates = await Promise.all(
      awbList.map(async (awb) => {
        const weight = calculateAWBWeight(awb)
        const country = awb.receiver?.country || "Unknown"

        const rate = await fetchRateFromAPI(selectedRateType, weight, country)

        if (rate === null) {
          errors.push(`Failed to fetch rate for AWB ${awb.trackingNumber} (${country})`)
          return {
            awbId: awb._id,
            rate: Number.parseFloat(awb.rateInfo?.rate) || 0,
            weight: weight,
            country: country,
            isFromAPI: false,
          }
        }

        return {
          awbId: awb._id,
          rate: rate,
          weight: weight,
          country: country,
          isFromAPI: true,
        }
      }),
    )

    setManualRates(updatedRates)
    setRateApiErrors(errors)
    setLoadingRates(false)
  }

  const calculateAWBWeight = (awb) => {
    const boxes = awb.boxes || []
    const ourBoxes = awb.ourBoxes || []
    const vendorBoxes = awb.vendorBoxes || []
    return [...boxes, ...ourBoxes, ...vendorBoxes].reduce(
      (sum, box) => sum + (Number.parseFloat(box.chargeableWeight) || 0),
      0,
    )
  }

  const applyFilters = () => {
    let result = [...awbs]

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate)
      result = result.filter((awb) => new Date(awb.date) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter((awb) => new Date(awb.date) <= end)
    }

    // Filter by tracking number
    if (searchTrackingNumber) {
      result = result.filter(
        (awb) => awb.trackingNumber?.includes(searchTrackingNumber) || awb.cNoteNumber?.includes(searchTrackingNumber),
      )
    }

    // Filter by country
    if (searchCountry) {
      result = result.filter((awb) => awb.receiver?.country?.toLowerCase().includes(searchCountry.toLowerCase()))
    }

    // Filter by selected client/franchise
    if (selectedClientFranchise) {
      result = result.filter((awb) => awb.refCode === selectedClientFranchise.code)
    }

    setFilteredAwbs(result)

    // Initialize rates
    if (rateSource === "awb") {
      setManualRates(
        result.map((awb) => ({
          awbId: awb._id,
          rate: Number.parseFloat(awb.rateInfo?.rate) || 0,
          weight: Number.parseFloat(awb.rateInfo?.weight) || calculateAWBWeight(awb),
          country: awb.receiver?.country || "Unknown",
          isFromAPI: false,
          billed: false,
        })),
      )
    }
  }

  const checkBilledStatus = async (awbId) => {
    try {
      const response = await fetch(`/api/awb/id/${awbId}/billing-status`)
      if (response.ok) {
        const data = await response.json()
        return data.billed || false
      }
    } catch (error) {
      console.error("Error checking billing status:", error)
    }
    return false
  }

  // Usage: when rendering table, check status
  useEffect(() => {
    const checkAllStatus = async () => {
      const updatedRates = await Promise.all(
        manualRates.map(async (rate) => {
          // const isBilled = await checkBilledStatus(rate.awbId)
          const isBilled = false // For demo purposes, assume unbilled
          return { ...rate, billed: isBilled }
        }),
      )
      setManualRates(updatedRates)
    }

    if (manualRates.length > 0) {
      checkAllStatus()
    }
  }, [filteredAwbs])

  const handleAWBSelection = (awbId) => {
    setSelectedAwbs((prev) => (prev.includes(awbId) ? prev.filter((id) => id !== awbId) : [...prev, awbId]))
  }

  const handleRateChange = (awbId, field, value) => {
    setManualRates((prev) =>
      prev.map((rate) => (rate.awbId === awbId ? { ...rate, [field]: Number.parseFloat(value) || 0 } : rate)),
    )
  }

  const handleBillingInfoChange = (field, value) => {
    setBillingInfo((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const calculateTotals = () => {
    if (selectedAwbs.length === 0) {
      setTotals({
        subtotal: 0,
        fuelCharges: 0,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        total: 0,
        paid: 0,
        balance: 0,
      })
      return
    }

    const selectedRates = manualRates.filter((rate) => selectedAwbs.includes(rate.awbId))
    const subtotal = selectedRates.reduce((sum, rate) => sum + rate.rate, 0)

    // Calculate fuel charges
    let fuelCharges = 0
    if (rateSettings.fuelCharge > 0) {
      fuelCharges = rateSettings.fuelCharge
    } else if (rateSettings.fuelChargePercent > 0) {
      fuelCharges = (subtotal * rateSettings.fuelChargePercent) / 100
    }

    const taxableAmount = subtotal + fuelCharges

    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    if (rateSettings.includeGST) {
      const taxRate = rateSettings.igst > 0 ? rateSettings.igst : rateSettings.cgst + rateSettings.sgst
      const baseTaxableValue = taxableAmount / (1 + taxRate / 100)
      const taxAmount = taxableAmount - baseTaxableValue

      if (rateSettings.igst > 0) {
        igstAmount = taxAmount
      } else {
        cgstAmount = taxAmount / 2
        sgstAmount = taxAmount / 2
      }
    } else {
      if (rateSettings.igst > 0) {
        igstAmount = (taxableAmount * rateSettings.igst) / 100
      } else {
        cgstAmount = (taxableAmount * rateSettings.cgst) / 100
        sgstAmount = (taxableAmount * rateSettings.sgst) / 100
      }
    }

    const total = rateSettings.includeGST ? taxableAmount : taxableAmount + cgstAmount + sgstAmount + igstAmount
    const balance = total - totals.paid

    setTotals({
      subtotal,
      fuelCharges,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      paid: totals.paid,
      balance,
    })
  }

  const handlePaidAmountChange = (value) => {
    const paid = Number.parseFloat(value) || 0
    setTotals((prev) => ({
      ...prev,
      paid,
      balance: prev.total - paid,
    }))
  }

  const handleRateSourceChange = async (value) => {
    setRateSource(value)
    if (value === "rates" && selectedRateType && filteredAwbs.length > 0) {
      await fetchRatesForAWBs(filteredAwbs)
    } else if (value === "awb") {
      applyFilters()
    }
  }

  const handleRateTypeChange = async (value) => {
    setSelectedRateType(value)
    if (rateSource === "rates" && value && filteredAwbs.length > 0) {
      await fetchRatesForAWBs(filteredAwbs)
    }
  }

  const saveBilling = async () => {
    if (!selectedClientFranchise) {
      alert("Please select a client or franchise")
      return
    }

    if (selectedAwbs.length === 0) {
      alert("Please select at least one AWB")
      return
    }

    try {
      setLoading(true)
      const billingData = {
        billingInfo,
        rateSource,
        selectedRateType: rateSource === "rates" ? selectedRateType : null,
        clientFranchiseType: selectedClientFranchise.type,
        awbs: selectedAwbs.map((id) => {
          const awb = awbs.find((a) => a._id === id)
          const rate = manualRates.find((r) => r.awbId === id)
          const ratePerKg = rate?.weight ? rate.rate / rate.weight : 0

          return {
            awbId: id,
            trackingNumber: awb.trackingNumber,
            cNoteNumber: awb.cNoteNumber,
            weight: rate?.weight || 0,
            ratePerKg: Number.parseFloat(ratePerKg.toFixed(2)),
            amount: rate?.rate || 0,
            country: awb.receiver?.country || "Unknown",
            isFromAPI: rate?.isFromAPI || false,
          }
        }),
        subtotal: totals.subtotal,
        fuelCharges: totals.fuelCharges,
        taxableAmount: totals.taxableAmount,
        cgst: rateSettings.cgst,
        sgst: rateSettings.sgst,
        igst: rateSettings.igst,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        total: totals.total,
        paid: totals.paid,
        balance: totals.balance,
      }

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingData),
      })

      if (!res.ok) throw new Error("Failed to save bill")
      const result = await res.json()

      alert(`Bill Saved! Bill No: ${result.bill.billNumber}`)
      setSelectedAwbs([])
      setSelectedClientFranchise(null)
      setBillingInfo({ name: "", address: "", gst: "", isEditable: true })
      setTotals({
        subtotal: 0,
        fuelCharges: 0,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        total: 0,
        paid: 0,
        balance: 0,
      })
    } catch (err) {
      console.error(err)
      alert("Error saving bill")
    } finally {
      setLoading(false)
    }
  }

  const generateInvoicePDF = () => {
    if (!selectedClientFranchise) {
      alert("Please select a client or franchise")
      return
    }

    if (selectedAwbs.length === 0) {
      alert("Please select at least one AWB")
      return
    }

    setShowInvoicePreview(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Create New Bill
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Generate invoice for selected AWBs</p>
          </div>
          <Link href="/billing">
            <Button variant="outline">
              <ChevronRight className="w-4 h-4 mr-2" />
              View All Bills
            </Button>
          </Link>
        </div>

        {/* Step 1: Select Client/Franchise */}
        <Card className="mb-8 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg">
                1
              </Badge>
              Select Client or Franchise
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Client / Franchise</Label>
              <div className="relative">
                <Button
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span>
                    {selectedClientFranchise
                      ? `${selectedClientFranchise.name} (${selectedClientFranchise.type})`
                      : "Search and select client or franchise..."}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {showClientDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search by name or code..."
                        value={clientFranchiseSearch}
                        onChange={(e) => setClientFranchiseSearch(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredClientFranchiseList.length > 0 ? (
                        filteredClientFranchiseList.map((item) => (
                          <button
                            key={`${item.type}-${item.code}`}
                            onClick={() => handleSelectClientFranchise(item)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center border-b last:border-b-0"
                          >
                            <div>
                              <p className="font-medium">{item.name || item.companyName}</p>
                              <p className="text-sm text-gray-500">{item.code}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {item.type}
                            </Badge>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No results found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedClientFranchise && (
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        {selectedClientFranchise.name || selectedClientFranchise.companyName}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                        {filteredAwbs.length} AWBs available for billing
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Filter AWBs */}
        {selectedClientFranchise && (
          <Card className="mb-8 shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg">
                  2
                </Badge>
                Filter & Select AWBs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    type="text"
                    value={searchTrackingNumber}
                    onChange={(e) => setSearchTrackingNumber(e.target.value)}
                    placeholder="Search tracking..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    type="text"
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    placeholder="Filter by country"
                  />
                </div>
              </div>

              {/* AWBs Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {selectedAwbs.length} of {filteredAwbs.length} AWBs selected
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectAll(!selectAll)}
                    variant={selectAll ? "destructive" : "default"}
                    size="sm"
                  >
                    {selectAll ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={() => setSelectAll(!selectAll)}
                            className="h-4 w-4 rounded"
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAwbs.map((awb) => {
                        const weight = calculateAWBWeight(awb)
                        const rate = manualRates.find((r) => r.awbId === awb._id)
                        return (
                          <TableRow key={awb._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedAwbs.includes(awb._id)}
                                onChange={() => handleAWBSelection(awb._id)}
                                className="h-4 w-4 rounded"
                              />
                            </TableCell>
                            <TableCell>{new Date(awb.date).toLocaleDateString("en-IN")}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{awb.trackingNumber}</Badge>
                            </TableCell>
                            <TableCell>{awb.receiver?.country || "N/A"}</TableCell>
                            <TableCell className="font-semibold">{weight.toFixed(2)} kg</TableCell>
                            <TableCell>
                              {rate?.billed ? (
                                <Badge className="bg-blue-100 text-blue-800">Billed</Badge>
                              ) : (
                                <Badge variant="outline">Unbilled</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {filteredAwbs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AWBs found with selected filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Configure Rates */}
        {selectedAwbs.length > 0 && (
          <Card className="mb-8 shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg">
                  3
                </Badge>
                Configure Rates & Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Rate Source Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Rate Calculation Source</Label>
                <RadioGroup value={rateSource} onValueChange={handleRateSourceChange}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <RadioGroupItem value="awb" id="awb" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="awb" className="cursor-pointer font-medium">
                          Rate from AWB Data
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Use rates from AWB records (default)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <RadioGroupItem value="rates" id="rates" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="rates" className="cursor-pointer font-medium">
                          Rate from Database
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fetch rates from rate master</p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {rateSource === "rates" && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Label className="text-sm font-semibold mb-3 block">Select Rate Type</Label>
                    <select
                      value={selectedRateType}
                      onChange={(e) => handleRateTypeChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a rate type</option>
                      {availableRates.map((rate) => (
                        <option key={rate._id} value={rate.originalName}>
                          {rate.originalName}
                        </option>
                      ))}
                    </select>

                    {loadingRates && (
                      <div className="mt-3 flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fetching rates...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tax Settings */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">GST Settings</Label>
                <RadioGroup
                  value={rateSettings.includeGST ? "yes" : "no"}
                  onValueChange={(value) => setRateSettings((prev) => ({ ...prev, includeGST: value === "yes" }))}
                >
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="gst-yes" />
                      <Label htmlFor="gst-yes">Rates include GST</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="gst-no" />
                      <Label htmlFor="gst-no">Rates exclude GST</Label>
                    </div>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>CGST (%)</Label>
                    <Input
                      type="number"
                      value={rateSettings.cgst}
                      onChange={(e) =>
                        setRateSettings((prev) => ({
                          ...prev,
                          cgst: Number.parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST (%)</Label>
                    <Input
                      type="number"
                      value={rateSettings.sgst}
                      onChange={(e) =>
                        setRateSettings((prev) => ({
                          ...prev,
                          sgst: Number.parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IGST (%)</Label>
                    <Input
                      type="number"
                      value={rateSettings.igst}
                      onChange={(e) =>
                        setRateSettings((prev) => ({
                          ...prev,
                          igst: Number.parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fuel Charges */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Fuel Charges</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fixed Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rateSettings.fuelCharge}
                      onChange={(e) =>
                        setRateSettings((prev) => ({
                          ...prev,
                          fuelCharge: Number.parseFloat(e.target.value) || 0,
                          fuelChargePercent: 0,
                        }))
                      }
                      placeholder="Enter fixed fuel charge"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>OR Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rateSettings.fuelChargePercent}
                      onChange={(e) =>
                        setRateSettings((prev) => ({
                          ...prev,
                          fuelChargePercent: Number.parseFloat(e.target.value) || 0,
                          fuelCharge: 0,
                        }))
                      }
                      placeholder="Enter percentage"
                    />
                  </div>
                </div>
                {(rateSettings.fuelCharge > 0 || rateSettings.fuelChargePercent > 0) && (
                  <p className="text-sm text-green-600 font-medium">Fuel Charges: ₹{totals.fuelCharges.toFixed(2)}</p>
                )}
              </div>

              <Separator />

              {/* Rate Details Table */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Rate Details</Label>
                <div className="overflow-x-auto rounded-lg border">
                  <Table size="sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Tracking</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Rate/kg (₹)</TableHead>
                        <TableHead>Total (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualRates
                        .filter((r) => selectedAwbs.includes(r.awbId))
                        .map((rate) => {
                          const awb = awbs.find((a) => a._id === rate.awbId)
                          const ratePerKg = rate.weight > 0 ? rate.rate / rate.weight : 0
                          return (
                            <TableRow key={rate.awbId}>
                              <TableCell>{awb?.trackingNumber}</TableCell>
                              <TableCell>{rate.weight.toFixed(2)}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={ratePerKg.toFixed(2)}
                                  onChange={(e) => {
                                    const newRate = Number.parseFloat(e.target.value) * rate.weight
                                    handleRateChange(rate.awbId, "rate", newRate)
                                  }}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={rate.rate.toFixed(2)}
                                  onChange={(e) => handleRateChange(rate.awbId, "rate", e.target.value)}
                                  className="w-28"
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Billing Information */}
        {selectedAwbs.length > 0 && (
          <Card className="mb-8 shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg">
                  4
                </Badge>
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Billing Name</Label>
                  <Input
                    type="text"
                    value={billingInfo.name}
                    onChange={(e) => handleBillingInfoChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    type="text"
                    value={billingInfo.gst}
                    onChange={(e) => handleBillingInfoChange("gst", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Billing Address</Label>
                  <textarea
                    value={billingInfo.address}
                    onChange={(e) => handleBillingInfoChange("address", e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Summary & Actions */}
        {selectedAwbs.length > 0 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg">
                  5
                </Badge>
                Billing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-lg">₹{totals.subtotal.toFixed(2)}</span>
                </div>

                {totals.fuelCharges > 0 && (
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">Fuel Charges</span>
                    <span className="font-semibold text-lg text-orange-600">₹{totals.fuelCharges.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Taxable Amount</span>
                  <span className="font-semibold">₹{totals.taxableAmount.toFixed(2)}</span>
                </div>

                {totals.cgstAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">CGST ({rateSettings.cgst}%)</span>
                    <span className="font-semibold">₹{totals.cgstAmount.toFixed(2)}</span>
                  </div>
                )}

                {totals.sgstAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">SGST ({rateSettings.sgst}%)</span>
                    <span className="font-semibold">₹{totals.sgstAmount.toFixed(2)}</span>
                  </div>
                )}

                {totals.igstAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-gray-600">IGST ({rateSettings.igst}%)</span>
                    <span className="font-semibold">₹{totals.igstAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-4 bg-gray-50 dark:bg-gray-800 px-4 rounded-lg">
                  <span className="font-bold text-xl">Grand Total</span>
                  <span className="font-bold text-2xl text-blue-600">₹{totals.total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Paid Amount</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={totals.paid}
                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                    className="w-40 text-right"
                  />
                </div>

                <div className="flex justify-between items-center py-4 bg-gray-50 dark:bg-gray-800 px-4 rounded-lg">
                  <span className="font-bold text-lg">Balance Due</span>
                  <span className={`font-bold text-2xl ${totals.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{totals.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex gap-4 bg-gray-50 dark:bg-gray-800 justify-end">
              <Button variant="outline" onClick={generateInvoicePDF} size="lg" disabled={loading}>
                <Eye className="w-4 h-4 mr-2" />
                Preview Invoice
              </Button>
              <Button
                onClick={saveBilling}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Bill
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

export default isAdminAuth(BillingCreatePage)
