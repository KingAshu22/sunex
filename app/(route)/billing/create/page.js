"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Save, Package, Loader2, ChevronDown, Check, ChevronRight, Eye, Settings, AlertCircle, Percent } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import isAdminAuth from "@/lib/isAdminAuth"

// --- Helper Functions ---
const safeParseFloat = (val) => parseFloat(val) || 0
const calculateAWBWeight = (awb) => (awb?.boxes || []).reduce((sum, box) => sum + safeParseFloat(box.chargeableWeight), 0)

// --- Main Component ---
function BillingCreatePage() {
  // State Management
  const [allAwbs, setAllAwbs] = useState([]) // Master list of all AWBs
  const [filteredAwbs, setFilteredAwbs] = useState([])
  const [selectedAwbs, setSelectedAwbs] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [awbRates, setAwbRates] = useState([]) // Holds detailed rate info for each AWB

  // Filters & Toggles
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTrackingNumber, setSearchTrackingNumber] = useState("")
  const [searchCountry, setSearchCountry] = useState("")
  const [hideBilled, setHideBilled] = useState(true)

  // Client/Franchise Selection
  const [clientFranchiseList, setClientFranchiseList] = useState([])
  const [clientFranchiseSearch, setClientFranchiseSearch] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClientFranchise, setSelectedClientFranchise] = useState(null)

  // Billing Info
  const [billingInfo, setBillingInfo] = useState({ name: "", address: "", gst: "" })

  // Rate Settings & Source
  const [rateSource, setRateSource] = useState("awb")
  const [availableRates, setAvailableRates] = useState([])
  const [selectedRateType, setSelectedRateType] = useState("")
  const [rateSettings, setRateSettings] = useState({ cgst: 9, sgst: 9, igst: 0, profitPercent: 0 })
  const [rateApiErrors, setRateApiErrors] = useState([])

  // Totals
  const [totals, setTotals] = useState({ subtotal: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, total: 0, paid: 0, balance: 0 })

  // UI States
  const [loading, setLoading] = useState(true)
  const [loadingRates, setLoadingRates] = useState(false)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [awbsRes, clientsRes, franchisesRes, ratesRes] = await Promise.all([
          fetch("/api/awb"),
          fetch("/api/clients"),
          fetch("/api/franchises"),
          fetch("/api/rates"),
        ])
        // Assuming /api/awb returns an array of AWB objects, each with an `isBilled: boolean` property
        const awbsData = await awbsRes.json()
        const clientsData = await clientsRes.json()
        const franchisesData = await franchisesRes.json()
        const ratesData = await ratesRes.json()

        setAllAwbs(awbsData)
        setAvailableRates(ratesData)

        const combined = [
          ...clientsData.map((c) => ({ ...c, type: "client", code: c.code || c._id })),
          ...franchisesData.map((f) => ({ ...f, type: "franchise", code: f.code || f._id })),
        ]
        setClientFranchiseList(combined)
      } catch (error) {
        console.error("Failed to fetch initial data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- Memoized Values ---
  const filteredClientFranchiseList = useMemo(() => {
    if (!clientFranchiseSearch) return clientFranchiseList
    return clientFranchiseList.filter(
      (item) => item.companyName?.toLowerCase().includes(clientFranchiseSearch.toLowerCase()) || item.name.toLowerCase().includes(clientFranchiseSearch.toLowerCase()) || item.code.toLowerCase().includes(clientFranchiseSearch.toLowerCase())
    )
  }, [clientFranchiseList, clientFranchiseSearch])

  // --- Core Logic & Effects ---

  const calculateRowRate = useCallback((rateData) => {
    const newRate = { ...rateData }
    newRate.subtotal = safeParseFloat(newRate.baseCharge) + safeParseFloat(newRate.fuelSurcharge) + safeParseFloat(newRate.otherCharges) + safeParseFloat(newRate.profitCharges)
    const taxRate = rateSettings.igst > 0 ? rateSettings.igst : rateSettings.cgst + rateSettings.sgst
    newRate.gstAmount = (newRate.subtotal * taxRate) / 100
    newRate.total = newRate.subtotal + newRate.gstAmount
    return newRate
  }, [rateSettings.cgst, rateSettings.sgst, rateSettings.igst])

  const applyFiltersAndRates = useCallback(() => {
    let result = allAwbs.filter((awb) => (selectedClientFranchise ? awb.refCode === selectedClientFranchise.code : true))
    if (hideBilled) result = result.filter(awb => !awb.isBilled)
    if (startDate) result = result.filter((awb) => new Date(awb.date) >= new Date(startDate))
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      result = result.filter((awb) => new Date(awb.date) <= end)
    }
    if (searchTrackingNumber) result = result.filter((awb) => awb.trackingNumber?.includes(searchTrackingNumber) || awb.cNoteNumber?.includes(searchTrackingNumber))
    if (searchCountry) result = result.filter((awb) => awb.receiver?.country?.toLowerCase().includes(searchCountry.toLowerCase()))

    setFilteredAwbs(result)

    if (rateSource === "awb") {
      const ratesFromAwb = result.map((awb) => {
        const rateInfo = awb.rateInfo || {}
        const initialRate = {
          awbId: awb._id,
          weight: safeParseFloat(rateInfo.weight) || calculateAWBWeight(awb),
          service: rateInfo?.courier || "N/A",
          baseCharge: safeParseFloat(rateInfo.baseCharge),
          fuelSurcharge: safeParseFloat(rateInfo.fuelSurcharge),
          otherCharges: safeParseFloat(rateInfo.otherCharges),
          profitCharges: 0,
          isFromAPI: false,
          billed: awb.isBilled,
        }
        return calculateRowRate(initialRate)
      })
      setAwbRates(ratesFromAwb)
    } else if (rateSource === "rates" && selectedRateType) {
      fetchRatesForAWBs(result)
    }
  }, [allAwbs, selectedClientFranchise, startDate, endDate, searchTrackingNumber, searchCountry, hideBilled, rateSource, selectedRateType, calculateRowRate])

  useEffect(() => { applyFiltersAndRates() }, [applyFiltersAndRates])
  useEffect(() => { setSelectedAwbs(selectAll ? filteredAwbs.map((awb) => awb._id) : []) }, [selectAll, filteredAwbs])

  useEffect(() => {
    const selectedRateObjects = awbRates.filter((rate) => selectedAwbs.includes(rate.awbId))
    const newTotals = selectedRateObjects.reduce((acc, rate) => {
      acc.subtotal += safeParseFloat(rate.subtotal)
      acc.gstAmount += safeParseFloat(rate.gstAmount)
      acc.total += safeParseFloat(rate.total)
      return acc
    }, { subtotal: 0, gstAmount: 0, total: 0 })
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0
    if (rateSettings.igst > 0) { igstAmount = newTotals.gstAmount } else { cgstAmount = newTotals.gstAmount / 2; sgstAmount = newTotals.gstAmount / 2 }
    setTotals((prev) => ({ ...prev, subtotal: newTotals.subtotal, cgstAmount, sgstAmount, igstAmount, total: newTotals.total, balance: newTotals.total - prev.paid }))
  }, [selectedAwbs, awbRates, rateSettings.igst])

  // --- API Handlers ---
  const fetchRatesForAWBs = async (awbList) => {
    if (!selectedRateType) { setRateApiErrors(["Please select a rate type."]); return }
    setLoadingRates(true); setRateApiErrors([]); const errors = []

    const ratePromises = awbList.map(async (awb) => {
      const weight = calculateAWBWeight(awb)
      const country = awb.receiver?.country || "Unknown"
      try {
        const params = new URLSearchParams({ type: selectedRateType, weight, country, profitPercent: rateSettings.profitPercent })
        const response = await fetch(`/api/rate?${params}`)
        if (!response.ok) throw new Error(`API error for ${awb.trackingNumber}`)
        const data = await response.json()
        return {
          awbId: awb._id, weight: data.calculatedWeight, service: data.service,
          baseCharge: safeParseFloat(data.baseRate), fuelSurcharge: safeParseFloat(data.fuelCharges), otherCharges: safeParseFloat(data.extraChargeTotal),
          profitCharges: safeParseFloat(data.profitCharges), subtotal: safeParseFloat(data.subtotalBeforeGST), gstAmount: safeParseFloat(data.gstAmount), total: safeParseFloat(data.total),
          isFromAPI: true, billed: awb.isBilled,
        }
      } catch (error) {
        errors.push(`Failed to fetch rate for AWB ${awb.trackingNumber}. Using AWB data as fallback.`)
        const rateInfo = awb.rateInfo || {}
        const fallbackRate = {
          awbId: awb._id, weight: safeParseFloat(rateInfo.weight) || weight, service: rateInfo?.courier || "N/A",
          baseCharge: safeParseFloat(rateInfo.baseCharge), fuelSurcharge: safeParseFloat(rateInfo.fuelSurcharge), otherCharges: safeParseFloat(rateInfo.otherCharges),
          profitCharges: 0, isFromAPI: false, billed: awb.isBilled,
        }
        return calculateRowRate(fallbackRate)
      }
    })
    const updatedRates = await Promise.all(ratePromises); setAwbRates(updatedRates); setRateApiErrors(errors); setLoadingRates(false)
  }

  // --- Event Handlers ---
  const handleSelectClientFranchise = (item) => {
    setSelectedClientFranchise(item); setShowClientDropdown(false); setClientFranchiseSearch("");
    setBillingInfo({ name: item.companyName || item.name || "", address: item.address || "", gst: item.gstNo || item.gst || "" })
  }
  const handleAWBSelection = (awbId) => { setSelectedAwbs((prev) => (prev.includes(awbId) ? prev.filter((id) => id !== awbId) : [...prev, awbId])); setSelectAll(false) }
  const handleRateChange = (awbId, field, value) => {
    setAwbRates((prev) => prev.map((rate) => (rate.awbId === awbId ? calculateRowRate({ ...rate, [field]: value }) : rate)))
  }
  const handlePaidAmountChange = (value) => { const paid = safeParseFloat(value); setTotals((prev) => ({ ...prev, paid, balance: prev.total - paid })) }
  const handleRateSourceChange = (value) => { setRateSource(value) }
  const handleRateTypeChange = async (value) => {
    setSelectedRateType(value)
    if (rateSource === "rates" && value && filteredAwbs.length > 0) { await fetchRatesForAWBs(filteredAwbs) }
  }

  const saveBilling = async () => {
    if (!selectedClientFranchise) { alert("Please select a client or franchise."); return }
    if (selectedAwbs.length === 0) { alert("Please select at least one AWB to bill."); return }
    setLoading(true)
    try {
      const payload = {
        billingInfo,
        awbs: awbRates.filter(rate => selectedAwbs.includes(rate.awbId)).map(rate => {
          const awb = allAwbs.find(a => a._id === rate.awbId)
          return {
            awbId: rate.awbId,
            date: awb.date,
            trackingNumber: awb.trackingNumber,
            consigneeName: awb.receiver?.name || 'N/A',
            weight: rate.weight,
            country: awb.receiver?.country || 'N/A',
            service: rate.service,
            baseCharge: rate.baseCharge,
            fuelSurcharge: rate.fuelSurcharge,
            otherCharges: rate.otherCharges + rate.profitCharges, // Combine other charges with profit
            subtotal: rate.subtotal,
          }
        }),
        subtotal: totals.subtotal,
        cgst: rateSettings.cgst, sgst: rateSettings.sgst, igst: rateSettings.igst,
        cgstAmount: totals.cgstAmount, sgstAmount: totals.sgstAmount, igstAmount: totals.igstAmount,
        total: totals.total, paid: totals.paid, balance: totals.balance,
      }

      const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(`Failed to save bill: ${await res.text()}`)
      const result = await res.json()

      alert(`Bill Saved Successfully! Bill Number: ${result.bill.billNumber}`)
      // Update master AWB list to mark billed AWBs, providing instant feedback
      setAllAwbs(prevAwbs => prevAwbs.map(awb => selectedAwbs.includes(awb._id) ? { ...awb, isBilled: true } : awb))
      // Reset form
      setSelectedAwbs([]); setSelectedClientFranchise(null); setSelectAll(false);
      setBillingInfo({ name: "", address: "", gst: "" })
      setTotals({ subtotal: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, total: 0, paid: 0, balance: 0 })
    } catch (err) {
      console.error(err); alert(`Error saving bill: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // --- JSX ---
  if (loading && allAwbs.length === 0) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /><span className="ml-4 text-lg">Loading Data...</span></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <div className="flex justify-between items-start mb-8">
          <div><h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Create New Bill</h1><p className="text-gray-600 dark:text-gray-400">Generate an invoice for selected Air Waybills.</p></div>
          <Link href="/billing"><Button variant="outline"><ChevronRight className="w-4 h-4 mr-2" />View All Bills</Button></Link>
        </div>

        {/* Step 1: Select Client/Franchise */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="secondary" className="text-lg">1</Badge>Select Client or Franchise</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label className="font-semibold">Client / Franchise</Label>
              <div className="relative">
                <Button onClick={() => setShowClientDropdown(!showClientDropdown)} variant="outline" className="w-full justify-between">
                  <span>{selectedClientFranchise ? `${selectedClientFranchise.name} (${selectedClientFranchise.type})` : "Search and select..."}</span><ChevronDown className="w-4 h-4" />
                </Button>
                {showClientDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50">
                    <div className="p-2 border-b"><Input placeholder="Search by name or code..." value={clientFranchiseSearch} onChange={(e) => setClientFranchiseSearch(e.target.value)} /></div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredClientFranchiseList.length > 0 ? (filteredClientFranchiseList.map((item) => (
                        <button key={`${item.type}-${item.code}`} onClick={() => handleSelectClientFranchise(item)} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center border-b last:border-b-0">
                          <div><p className="font-medium">{item.companyName || item.name}</p><p className="text-sm text-gray-500">{item.code}</p></div><Badge variant="outline">{item.type}</Badge>
                        </button>
                      ))) : (<div className="p-4 text-center text-gray-500">No results found</div>)}
                    </div>
                  </div>
                )}
              </div>
              {selectedClientFranchise && (
                <div className="p-4 mt-4 bg-green-50 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div><p className="font-semibold text-green-900 dark:text-green-100">{selectedClientFranchise.name}</p><p className="text-sm text-green-700 dark:text-green-200 mt-1">{filteredAwbs.length} billable AWBs found for this selection.</p></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Filter AWBs */}
        {selectedClientFranchise && (
          <Card className="mb-8 shadow-lg border-0">
            <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="secondary" className="text-lg">2</Badge>Filter & Select AWBs</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <Input value={searchTrackingNumber} onChange={(e) => setSearchTrackingNumber(e.target.value)} placeholder="Search tracking no..." />
                <Input value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} placeholder="Filter by country..." />
                <div className="flex items-center space-x-2"><Switch id="hide-billed" checked={hideBilled} onCheckedChange={setHideBilled} /><Label htmlFor="hide-billed">Hide Billed AWBs</Label></div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><p className="font-semibold">{selectedAwbs.length} of {filteredAwbs.length} AWBs selected</p><Button onClick={() => setSelectAll(!selectAll)} variant={selectAll ? "destructive" : "default"} size="sm">{selectAll ? "Deselect All" : "Select All"}</Button></div>
                <div className="overflow-x-auto rounded-lg border max-h-[50vh]"><Table><TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10"><TableRow>
                  <TableHead className="w-12"><Input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} className="h-4 w-4" /></TableHead>
                  <TableHead>Date</TableHead><TableHead>Tracking</TableHead><TableHead>Country</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader><TableBody>
                    {filteredAwbs.length > 0 ? (filteredAwbs.map((awb) => (<TableRow key={awb._id} data-state={selectedAwbs.includes(awb._id) && "selected"} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell><Input type="checkbox" checked={selectedAwbs.includes(awb._id)} onChange={() => handleAWBSelection(awb._id)} className="h-4 w-4" disabled={awb.isBilled} /></TableCell>
                      <TableCell>{new Date(awb.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell><Badge variant="outline">{awb.trackingNumber}</Badge></TableCell>
                      <TableCell>{awb.receiver?.country || "N/A"}</TableCell>
                      <TableCell className="font-semibold">{calculateAWBWeight(awb).toFixed(2)} kg</TableCell>
                      <TableCell>{awb.isBilled ? <Badge variant="secondary">Billed</Badge> : <Badge variant="outline" className="text-green-600 border-green-400">Unbilled</Badge>}</TableCell>
                    </TableRow>))) : (<TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500"><Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No billable AWBs found with selected filters.</p></TableCell></TableRow>)}
                  </TableBody></Table></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Configure Rates */}
        {selectedAwbs.length > 0 && (
          <Card className="mb-8 shadow-lg border-0">
            <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="secondary" className="text-lg">3</Badge>Configure Rates & Charges</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <Label className="text-base font-semibold">Rate Calculation Source</Label>
                  <RadioGroup value={rateSource} onValueChange={handleRateSourceChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Label htmlFor="awb" className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"><RadioGroupItem value="awb" id="awb" className="mt-1" /><div className="flex-1"><p className="font-medium">From AWB Data</p><p className="text-sm text-gray-500">Use (and edit) rates from the original AWB record.</p></div></Label>
                    <Label htmlFor="rates" className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"><RadioGroupItem value="rates" id="rates" className="mt-1" /><div className="flex-1"><p className="font-medium">From Rate Master</p><p className="text-sm text-gray-500">Fetch definitive rates from the database.</p></div></Label>
                  </RadioGroup>
                  {rateSource === "rates" && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Select Rate Type</Label>
                        <select value={selectedRateType} onChange={(e) => handleRateTypeChange(e.target.value)} className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select a rate type...</option>{availableRates.map((rate) => (<option key={rate._id} value={rate.originalName}>{rate.originalName}</option>))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Profit Margin</Label>
                        <div className="relative"><Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input type="number" value={rateSettings.profitPercent} onChange={(e) => setRateSettings(p => ({ ...p, profitPercent: safeParseFloat(e.target.value) }))} onBlur={() => fetchRatesForAWBs(filteredAwbs)} className="pl-9" /></div>
                      </div>
                      {loadingRates && <div className="md:col-span-2 mt-3 flex items-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin" />Fetching rates...</div>}
                      {rateApiErrors.length > 0 && <div className="md:col-span-2 mt-3 text-red-600 text-sm space-y-1">{rateApiErrors.map((e, i) => <p key={i} className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {e}</p>)}</div>}
                    </div>
                  )}
                </div>
                <Card className="bg-gray-50 dark:bg-gray-800/50"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />Tax Settings</CardTitle></CardHeader><CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 items-center"><Label>CGST %</Label><Input type="number" value={rateSettings.cgst} onChange={(e) => setRateSettings(p => ({ ...p, cgst: safeParseFloat(e.target.value), igst: 0 }))} disabled={rateSettings.igst > 0} /></div>
                  <div className="grid grid-cols-2 gap-3 items-center"><Label>SGST %</Label><Input type="number" value={rateSettings.sgst} onChange={(e) => setRateSettings(p => ({ ...p, sgst: safeParseFloat(e.target.value), igst: 0 }))} disabled={rateSettings.igst > 0} /></div>
                  <div className="grid grid-cols-2 gap-3 items-center"><Label>IGST %</Label><Input type="number" value={rateSettings.igst} onChange={(e) => setRateSettings(p => ({ ...p, igst: safeParseFloat(e.target.value), cgst: 0, sgst: 0 }))} /></div>
                </CardContent></Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">Rate Details for Selected AWBs</Label>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead>Date</TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Consignee</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Base (₹)</TableHead>
                        <TableHead>Fuel (₹)</TableHead>
                        <TableHead>Other (₹)</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awbRates.filter((r) => selectedAwbs.includes(r.awbId)).map((rate) => {
                        const awb = filteredAwbs.find((a) => a._id === rate.awbId);
                        const isReadOnly = rate.isFromAPI;
                        return (<TableRow key={rate.awbId} data-state="selected">
                          <TableCell>{new Date(awb.date).toLocaleDateString("en-IN")}</TableCell>
                          <TableCell><Badge variant="secondary">{awb?.trackingNumber}</Badge></TableCell>
                          <TableCell className="font-medium max-w-xs truncate">{awb?.receiver?.name}</TableCell>
                          <TableCell className="font-medium">{rate.weight.toFixed(2)} kg</TableCell>
                          <TableCell>{awb?.receiver?.country || "N/A"}</TableCell>
                          <TableCell>{rate.service}</TableCell>
                          <TableCell><Input type="number" value={rate.baseCharge.toFixed(2)} onChange={(e) => handleRateChange(rate.awbId, "baseCharge", e.target.value)} className="w-24" readOnly={isReadOnly} /></TableCell>
                          <TableCell><Input type="number" value={rate.fuelSurcharge.toFixed(2)} onChange={(e) => handleRateChange(rate.awbId, "fuelSurcharge", e.target.value)} className="w-24" readOnly={isReadOnly} /></TableCell>
                          <TableCell><Input type="number" value={(rate.otherCharges + rate.profitCharges).toFixed(2)} onChange={(e) => handleRateChange(rate.awbId, "otherCharges", e.target.value)} className="w-24" readOnly={isReadOnly} /></TableCell>
                          <TableCell className="font-medium">{rate.subtotal.toFixed(2)}</TableCell>
                          <TableCell className="font-medium text-red-600">{rate.gstAmount.toFixed(2)}</TableCell>
                          <TableCell className="font-bold text-blue-600">{rate.total.toFixed(2)}</TableCell>
                        </TableRow>)
                      })}
                    </TableBody></Table></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4 & 5: Billing Info, Summary & Actions */}
        {selectedAwbs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <Card className="lg:col-span-3 shadow-lg border-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="secondary" className="text-lg">4</Badge>Billing Information</CardTitle></CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Billing Name</Label><Input value={billingInfo.name} onChange={(e) => setBillingInfo(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>GST Number</Label><Input value={billingInfo.gst} onChange={(e) => setBillingInfo(p => ({ ...p, gst: e.target.value }))} /></div>
                <div className="md:col-span-2 space-y-2"><Label>Billing Address</Label><textarea value={billingInfo.address} onChange={(e) => setBillingInfo(p => ({ ...p, address: e.target.value }))} rows="3" className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-xl border-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="secondary" className="text-lg">5</Badge>Billing Summary</CardTitle></CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">Subtotal</span><span className="font-semibold text-lg">₹{totals.subtotal.toFixed(2)}</span></div>
                  {totals.cgstAmount > 0 && <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">CGST ({rateSettings.cgst}%)</span><span className="font-semibold">₹{totals.cgstAmount.toFixed(2)}</span></div>}
                  {totals.sgstAmount > 0 && <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">SGST ({rateSettings.sgst}%)</span><span className="font-semibold">₹{totals.sgstAmount.toFixed(2)}</span></div>}
                  {totals.igstAmount > 0 && <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600 dark:text-gray-400">IGST ({rateSettings.igst}%)</span><span className="font-semibold">₹{totals.igstAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between items-center py-4 bg-gray-50 dark:bg-gray-800 px-4 rounded-lg"><span className="font-bold text-xl">Grand Total</span><span className="font-bold text-2xl text-blue-600 dark:text-blue-400">₹{totals.total.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center py-3 border-b"><span className="text-gray-600 dark:text-gray-400">Paid Amount</span><Input type="number" step="0.01" value={totals.paid} onChange={(e) => handlePaidAmountChange(e.target.value)} className="w-40 text-right" /></div>
                  <div className="flex justify-between items-center py-4 bg-gray-50 dark:bg-gray-800 px-4 rounded-lg"><span className="font-bold text-lg">Balance Due</span><span className={`font-bold text-2xl ${totals.balance > 0 ? "text-red-600" : "text-green-600"}`}>₹{totals.balance.toFixed(2)}</span></div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-4 bg-gray-50 dark:bg-gray-800/50 justify-end p-6">
                <Button variant="outline" onClick={() => setShowInvoicePreview(true)} size="lg" disabled={loading}><Eye className="w-4 h-4 mr-2" />Preview</Button>
                <Button onClick={saveBilling} size="lg" className="bg-green-600 hover:bg-green-700" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Bill</>}</Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default isAdminAuth(BillingCreatePage)