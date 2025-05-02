"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, Minus, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Countries } from "@/app/constants/country"
import axios from "axios"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import HsnSearchDialog from "./HsnSearchDialog"
import toast from "react-hot-toast"
import { Checkbox } from "@/components/ui/checkbox"
import ItemNameAutocomplete from "./ItemNameAutoComplete"
import PhotoUploader from "./PhotoUploader"

export default function AWBForm({ isEdit = false, awb }) {
  const router = useRouter()

  // State
  const [success, setSuccess] = useState(false)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState(null)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showHsnSearchDialog, setShowHsnSearchDialog] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState({ boxIndex: 0, itemIndex: 0 })
  const [boxCount, setBoxCount] = useState("")
  const [showItemDetails, setShowItemDetails] = useState(false)

  // Form state
  const [date, setDate] = useState(awb?.date || Date.now())
  const [parcelType, setParcelType] = useState(awb?.parcelType || "International")
  const [staffId, setStaffId] = useState(awb?.staffId || "")
  const [invoiceNumber, setInvoiceNumber] = useState(awb?.invoiceNumber || "")
  const [trackingNumber, setTrackingNumber] = useState(awb?.trackingNumber || "")
  const [via, setVia] = useState("Air Shipment")
  const [shipmentType, setShipmentType] = useState("Non Document")

  //Forwarding Details
  const [forwardingNo, setForwardingNo] = useState("")
  const [forwardingLink, setForwardingLink] = useState("")

  // Sender details
  const [senderName, setSenderName] = useState(awb?.sender?.name || "")
  const [senderAddress, setSenderAddress] = useState(awb?.sender?.address || "")
  const [senderCountry, setSenderCountry] = useState(awb?.sender?.country || "India")
  const [senderZipCode, setSenderZipCode] = useState(awb?.sender?.zip || "")
  const [senderContact, setSenderContact] = useState(awb?.sender?.contact || "")
  const [kycType, setKycType] = useState(awb?.sender?.kyc?.type || "Aadhaar No -")
  const [kyc, setKyc] = useState(awb?.sender?.kyc?.kyc || "")
  const [kycLink, setKycLink] = useState(awb?.sender?.kyc?.link || "")
  const [gst, setGst] = useState(awb?.gst || "")

  // Receiver details
  const [receiverName, setReceiverName] = useState(awb?.receiver?.name || "")
  const [receiverAddress, setReceiverAddress] = useState(awb?.receiver?.address || "")
  const [receiverCountry, setReceiverCountry] = useState(awb?.receiver?.country || "")
  const [receiverZipCode, setReceiverZipCode] = useState(awb?.receiver?.zip || "")
  const [receiverContact, setReceiverContact] = useState(awb?.receiver?.contact || "")

  // Box details
  const [boxes, setBoxes] = useState(awb?.boxes || [])

  // Derived state
  const [totalChargeableWeight, setTotalChargeableWeight] = useState("")

  // Generate boxes based on user input
  const generateBoxes = () => {
    const count = Number.parseInt(boxCount, 10)
    if (isNaN(count) || count <= 0) {
      toast.error("Please enter a valid number of boxes")
      return
    }

    const newBoxes = []
    for (let i = 0; i < count; i++) {
      newBoxes.push({
        length: "",
        breadth: "",
        height: "",
        actualWeight: "",
        dimensionalWeight: "",
        chargeableWeight: "",
        items: [{ name: "", quantity: "", price: "", hsnCode: "" }],
      })
    }
    setBoxes(newBoxes)
  }

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers
    return customers.filter((customer) => customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [customers, searchTerm])

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers()
    !isEdit && getInvoiceNumber()
  }, [isEdit])

  // Auto-fill sender details when sender name changes
  useEffect(() => {
    if (senderName) {
      const customer = customers.find((c) => c.name === senderName)
      if (customer) {
        setSenderAddress(customer.address || "")
        setSenderCountry(customer.country || "India")
        setSenderZipCode(customer.zip || "")
        setSenderContact(customer.contact || "")
        setKycType(customer.kyc?.type || "Aadhaar No -")
        setKyc(customer.kyc?.kyc || "")
        setGst(customer.gst || "")
      }
    }
  }, [senderName, customers])

  // Auto-fill receiver details when receiver name changes
  useEffect(() => {
    if (receiverName) {
      const customer = customers.find((c) => c.name === receiverName)
      if (customer) {
        setReceiverAddress(customer.address || "")
        setReceiverCountry(customer.country || "")
        setReceiverZipCode(customer.zip || "")
        setReceiverContact(customer.contact || "")
      }
    }
  }, [receiverName, customers])

  // Calculate total chargeable weight when boxes change
  useEffect(() => {
    const totalWeight = boxes.reduce((acc, box) => {
      const chargeableWeight = Number.parseFloat(box.chargeableWeight) || 0
      return acc + chargeableWeight
    }, 0)

    setTotalChargeableWeight(Math.round(totalWeight).toString())
  }, [boxes])

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/customer")
      setCustomers(response.data)
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  // Get invoice number from API
  const getInvoiceNumber = async () => {
    try {
      const response = await axios.get("/api/get-last-awb")
      const lastInvoiceNumber = response.data.invoiceNumber
      const incrementedNumber = (Number.parseInt(lastInvoiceNumber) + 1).toString()

      setInvoiceNumber(incrementedNumber)
      setTrackingNumber(response.data.trackingNumber)
    } catch (error) {
      console.error("Error fetching parcel:", error)
    }
  }

  // Box management functions
  const addBox = useCallback(() => {
    setBoxes((prevBoxes) => [
      ...prevBoxes,
      {
        length: "",
        breadth: "",
        height: "",
        actualWeight: "",
        dimensionalWeight: "",
        chargeableWeight: "",
        items: [{ name: "", quantity: "", price: "", hsnCode: "" }],
      },
    ])
  }, [])

  const removeBox = useCallback((boxIndex) => {
    setBoxes((prevBoxes) => prevBoxes.filter((_, index) => index !== boxIndex))
  }, [])

  const handleBoxChange = useCallback(
    (index, field, value) => {
      setBoxes((prevBoxes) => {
        const updatedBoxes = [...prevBoxes]
        let newValue = value

        // Check for Document type and actualWeight > 2
        if (field === "actualWeight" && shipmentType === "Document") {
          const numericWeight = Number.parseFloat(value)
          if (numericWeight > 3) {
            toast.error("For Document shipment, actual weight cannot exceed 3 kg.")
            newValue = "" // reset actualWeight
          }
        }

        updatedBoxes[index] = { ...updatedBoxes[index], [field]: newValue }

        // Recalculate weights if dimension or actual weight changes
        if (["length", "breadth", "height", "actualWeight"].includes(field)) {
          const box = updatedBoxes[index]
          const length = Number(box.length) || 0
          const breadth = Number(box.breadth) || 0
          const height = Number(box.height) || 0
          const actualWeight = Number(box.actualWeight) || 0

          const dimensionalWeight = Math.round((length * breadth * height) / 5000)
          const chargeableWeight = Math.max(actualWeight, dimensionalWeight)

          updatedBoxes[index].dimensionalWeight = dimensionalWeight
          updatedBoxes[index].chargeableWeight = chargeableWeight
        }

        return updatedBoxes
      })
    },
    [shipmentType],
  )

  // Item management functions
  const addItem = useCallback((boxIndex) => {
    setBoxes((prevBoxes) => {
      const updatedBoxes = [...prevBoxes]
      updatedBoxes[boxIndex] = {
        ...updatedBoxes[boxIndex],
        items: [...updatedBoxes[boxIndex].items, { name: "", quantity: "", price: "", hsnCode: "" }],
      }
      return updatedBoxes
    })
  }, [])

  const removeItem = useCallback((boxIndex, itemIndex) => {
    setBoxes((prevBoxes) => {
      const updatedBoxes = [...prevBoxes]
      updatedBoxes[boxIndex] = {
        ...updatedBoxes[boxIndex],
        items: updatedBoxes[boxIndex].items.filter((_, idx) => idx !== itemIndex),
      }
      return updatedBoxes
    })
  }, [])

  useEffect(() => {
    if (
      shipmentType === "Document" &&
      boxes.length > 0 &&
      boxes[0]?.items?.length > 0
    ) {
      const item = boxes[0].items[0]
      if (
        item.name !== "Document" ||
        item.price !== 10 ||
        item.hsnCode !== "482030"
      ) {
        handleItemChange(0, 0, "name", "Document")
        handleItemChange(0, 0, "price", 10)
        handleItemChange(0, 0, "hsnCode", "482030")
      }
    }
  }, [shipmentType, boxes])

  const handleItemChange = useCallback((boxIndex, itemIndex, field, value) => {
    setBoxes((prevBoxes) => {
      const updatedBoxes = [...prevBoxes]
      updatedBoxes[boxIndex] = {
        ...updatedBoxes[boxIndex],
        items: updatedBoxes[boxIndex].items.map((item, idx) =>
          idx === itemIndex ? { ...item, [field]: value } : item,
        ),
      }
      return updatedBoxes
    })
  }, [])

  // HSN search functions
  const openHsnSearch = (boxIndex, itemIndex) => {
    setCurrentItemIndex({ boxIndex, itemIndex })
    setShowHsnSearchDialog(true)
  }

  const handleSelectHsn = (hsnItem) => {
    const { boxIndex, itemIndex } = currentItemIndex

    setBoxes((prevBoxes) => {
      const updatedBoxes = [...prevBoxes]
      const currentItem = updatedBoxes[boxIndex].items[itemIndex]

      // If the item name is empty, fill it with the HSN item name
      if (!currentItem.name) {
        updatedBoxes[boxIndex].items[itemIndex] = {
          ...currentItem,
          name: hsnItem.item,
          hsnCode: hsnItem.code,
        }
      } else {
        // Otherwise just update the HSN code
        updatedBoxes[boxIndex].items[itemIndex] = {
          ...currentItem,
          hsnCode: hsnItem.code,
        }
      }

      return updatedBoxes
    })
  }

  // Search functions
  const openSearch = (type) => {
    setSearchType(type)
    setSearchTerm("")
    setShowSearchDialog(true)
  }

  const handleSelectCustomer = (customer) => {
    if (searchType === "sender") {
      setSenderName(customer.name)
    } else if (searchType === "receiver") {
      setReceiverName(customer.name)
    }
    setShowSearchDialog(false)
  }

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userType = localStorage.getItem("userType")
      const userId = localStorage.getItem("id")

      const parcelData = {
        parcelType,
        staffId: userType === "admin" ? "admin" : userId,
        invoiceNumber,
        date,
        trackingNumber,
        via,
        shipmentType,
        forwardingNo,
        forwardingLink,
        sender: {
          name: senderName,
          address: senderAddress,
          country: senderCountry,
          zip: senderZipCode,
          contact: senderContact,
          kyc: {
            type: kycType,
            kyc,
            link,
          },
          owner: localStorage.getItem("id"),
          gst,
        },
        receiver: {
          name: receiverName,
          address: receiverAddress,
          country: receiverCountry,
          zip: receiverZipCode,
          contact: receiverContact,
          owner: localStorage.getItem("id"),
        },
        boxes,
        ...(isEdit
          ? {}
          : {
            parcelStatus: [
              {
                status: "Shipment AWB Prepared - BOM HUB",
                timestamp: new Date(),
                comment: "",
              },
            ],
          }),
      }

      const response = isEdit
        ? await axios.put(`/api/awb/${trackingNumber}`, parcelData)
        : await axios.post("/api/awb", parcelData)

      if (response.status === 200) {
        setSuccess(true)
      } else {
        toast.error(`Failed to ${isEdit ? "update" : "save"} the parcel. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${isEdit ? "updating" : "saving"} parcel:`, error)
      toast.error(`An error occurred while ${isEdit ? "updating" : "saving"} the parcel.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#232C65]">{isEdit ? "Edit AWB" : "Create AWB"}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#232C65]">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Sr No:</Label>
              <Input id="invoiceNumber" type="text" placeholder="Invoice No." value={invoiceNumber} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking No:</Label>
              <Input
                id="trackingNumber"
                type="number"
                placeholder="Tracking No."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date), "PPP") : <span>Select Parcel Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(date)}
                    onSelect={(newDate) => setDate(newDate || Date.now())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Parcel Type</Label>
              <Select value={parcelType} onValueChange={setParcelType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Parcel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Domestic">Domestic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Via</Label>
              <Select value={via} onValueChange={setVia}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air Shipment">Air Shipment</SelectItem>
                  <SelectItem value="Cargo">Cargo</SelectItem>
                  <SelectItem value="Roadways">Roadways</SelectItem>
                  <SelectItem value="Railways">Railways</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <Select value={shipmentType} onValueChange={setShipmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Shipment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Document">Document</SelectItem>
                  <SelectItem value="Non Document">Non Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="forwardingNo">Forwarding No:</Label>
                  <Input
                    id="forwardingNo"
                    type="text"
                    placeholder="Forwarding No."
                    value={forwardingNo}
                    onChange={(e) => setForwardingNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forwardingLink">Forwarding Link:</Label>
                  <Input
                    id="forwardingLink"
                    type="text"
                    placeholder="Forwarding Link."
                    value={forwardingLink}
                    onChange={(e) => setForwardingLink(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sender Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#232C65]">Sender Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name*</Label>
              <div className="flex gap-2">
                <Input
                  id="senderName"
                  placeholder="Sender Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openSearch("sender")}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderAddress">Sender Address*</Label>
              <Textarea
                id="senderAddress"
                placeholder="Sender Address"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderCountry">Sender Country*</Label>
              <Select value={senderCountry} onValueChange={setSenderCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {Countries.map((country, index) => (
                    <SelectItem key={index} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderZipCode">Sender Zip Code*</Label>
              <Input
                id="senderZipCode"
                type="text"
                placeholder="Sender Zip Code"
                value={senderZipCode}
                onChange={(e) => setSenderZipCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderContact">Sender Contact*</Label>
              <Input
                id="senderContact"
                type="text"
                placeholder="Sender Contact"
                value={senderContact}
                onChange={(e) => setSenderContact(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sender KYC Type*</Label>
              <Select value={kycType} onValueChange={setKycType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select KYC Type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Aadhaar No -",
                    "Pan No -",
                    "Passport No -",
                    "Driving License No -",
                    "Voter ID Card No -",
                    "GST No -",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kyc">KYC*</Label>
              <Input
                id="kyc"
                type="text"
                placeholder="KYC"
                value={kyc}
                onChange={(e) => setKyc(e.target.value)}
                required
              />
            </div>
            {/* <PhotoUploader
              clientName={senderName}
              setProfilePic={setKycLink}
              initialImageLink={kycLink}
            /> */}
            <div className="space-y-2">
              <Label htmlFor="gst">GST</Label>
              <Input id="gst" type="text" placeholder="GST No" value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Receiver Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#232C65]">Receiver Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="receiverName">Receiver Name*</Label>
              <div className="flex gap-2">
                <Input
                  id="receiverName"
                  placeholder="Receiver Name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openSearch("receiver")}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiverAddress">Receiver Address*</Label>
              <Textarea
                id="receiverAddress"
                placeholder="Receiver Address"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiverCountry">Receiver Country*</Label>
              <Select value={receiverCountry} onValueChange={setReceiverCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {Countries.map((country, index) => (
                    <SelectItem key={index} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiverZipCode">Receiver Zip Code*</Label>
              <Input
                id="receiverZipCode"
                type="text"
                placeholder="Receiver Zip Code"
                value={receiverZipCode}
                onChange={(e) => setReceiverZipCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiverContact">Receiver Contact*</Label>
              <Input
                id="receiverContact"
                type="text"
                placeholder="Receiver Contact"
                value={receiverContact}
                onChange={(e) => setReceiverContact(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Box Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-[#232C65]">Box Details</CardTitle>
            <div className="text-sm font-medium">Total Chargeable Weight: {totalChargeableWeight} kg</div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Box Count Input */}
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="boxCount">How many boxes do you want?</Label>
                <Input
                  id="boxCount"
                  type="number"
                  placeholder="Enter number of boxes"
                  value={boxCount}
                  onChange={(e) => setBoxCount(e.target.value)}
                />
              </div>
              <Button type="button" onClick={generateBoxes} className="mb-0.5">
                Generate Boxes
              </Button>
            </div>

            {/* Box List */}
            {boxes.length > 0 ? (
              <div className="space-y-6">
                {boxes.map((box, boxIndex) => (
                  <Card key={boxIndex} className="border border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-xl text-[#232C65]">Box {boxIndex + 1}</CardTitle>
                      {boxIndex > 0 && (
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeBox(boxIndex)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Box
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Box Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`length-${boxIndex}`}>Length (cm)*</Label>
                          <Input
                            id={`length-${boxIndex}`}
                            type="number"
                            placeholder="Length (cm)"
                            value={box.length || ""}
                            onChange={(e) =>
                              handleBoxChange(boxIndex, "length", Number.parseFloat(e.target.value) || "")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`breadth-${boxIndex}`}>Breadth (cm)*</Label>
                          <Input
                            id={`breadth-${boxIndex}`}
                            type="number"
                            placeholder="Breadth (cm)"
                            value={box.breadth || ""}
                            onChange={(e) =>
                              handleBoxChange(boxIndex, "breadth", Number.parseFloat(e.target.value) || "")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`height-${boxIndex}`}>Height (cm)*</Label>
                          <Input
                            id={`height-${boxIndex}`}
                            type="number"
                            placeholder="Height (cm)"
                            value={box.height || ""}
                            onChange={(e) =>
                              handleBoxChange(boxIndex, "height", Number.parseFloat(e.target.value) || "")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`actualWeight-${boxIndex}`}>Actual Weight (kg)*</Label>
                          <Input
                            id={`actualWeight-${boxIndex}`}
                            type="number"
                            placeholder="Actual Weight (kg)"
                            value={box.actualWeight || ""}
                            onChange={(e) =>
                              handleBoxChange(boxIndex, "actualWeight", Number.parseFloat(e.target.value) || "")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dimensionalWeight-${boxIndex}`}>Dimensional Weight (kg)</Label>
                          <Input
                            id={`dimensionalWeight-${boxIndex}`}
                            type="number"
                            placeholder="Dimensional Weight (kg)"
                            value={box.dimensionalWeight || ""}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`chargeableWeight-${boxIndex}`}>Chargeable Weight (kg)</Label>
                          <Input
                            id={`chargeableWeight-${boxIndex}`}
                            type="number"
                            placeholder="Chargeable Weight (kg)"
                            value={box.chargeableWeight || ""}
                            readOnly
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Enter the number of boxes and click "Generate Boxes" to start
              </div>
            )}

            {/* Shipping Invoice Option */}
            {boxes.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox id="createShippingInvoice" checked={showItemDetails} onCheckedChange={setShowItemDetails} />
                  <Label htmlFor="createShippingInvoice" className="font-medium">
                    Do you want to create Shipping Invoice?
                  </Label>
                </div>

                {showItemDetails && (
                  <div className="space-y-6 mt-4">
                    {boxes.map((box, boxIndex) => (
                      <Card key={`items-${boxIndex}`} className="border border-gray-200">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl text-[#232C65]">Box {boxIndex + 1} Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Items */}
                          <div className="space-y-4">
                            {box.items.map((item, itemIndex) => (
                              <Card key={itemIndex} className="border border-gray-100">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                  <CardTitle className="text-lg text-[#232C65]">Item {itemIndex + 1}</CardTitle>
                                  {itemIndex > 0 && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeItem(boxIndex, itemIndex)}
                                    >
                                      <Minus className="h-4 w-4 mr-2" />
                                      Remove Item
                                    </Button>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Item Name - Take more space */}
                                    <div className="space-y-2 md:col-span-6">
                                      <Label htmlFor={`itemName-${boxIndex}-${itemIndex}`}>Name*</Label>
                                      <ItemNameAutocomplete
                                        id={`itemName-${boxIndex}-${itemIndex}`}
                                        value={item.name || ""}
                                        onChange={(value) => handleItemChange(boxIndex, itemIndex, "name", value)}
                                        onHsnSelect={(hsnItem) => {
                                          handleItemChange(boxIndex, itemIndex, "hsnCode", hsnItem.code)
                                        }}
                                        required={showItemDetails}
                                      />
                                    </div>

                                    {/* Quantity */}
                                    <div className="space-y-2 md:col-span-2">
                                      <Label htmlFor={`itemQuantity-${boxIndex}-${itemIndex}`}>Quantity*</Label>
                                      <Input
                                        id={`itemQuantity-${boxIndex}-${itemIndex}`}
                                        type="number"
                                        placeholder="Quantity"
                                        value={item.quantity || ""}
                                        onChange={(e) =>
                                          handleItemChange(boxIndex, itemIndex, "quantity", e.target.value)
                                        }
                                        required={showItemDetails}
                                      />
                                    </div>

                                    {/* Price */}
                                    <div className="space-y-2 md:col-span-2">
                                      <Label htmlFor={`itemPrice-${boxIndex}-${itemIndex}`}>Price*</Label>
                                      <Input
                                        id={`itemPrice-${boxIndex}-${itemIndex}`}
                                        type="number"
                                        placeholder="Price"
                                        value={item.price || ""}
                                        onChange={(e) => handleItemChange(boxIndex, itemIndex, "price", e.target.value)}
                                        required={showItemDetails}
                                      />
                                    </div>

                                    {/* HSN Code */}
                                    <div className="space-y-2 md:col-span-2">
                                      <Label htmlFor={`hsnCode-${boxIndex}-${itemIndex}`}>HSN Code</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          id={`hsnCode-${boxIndex}-${itemIndex}`}
                                          type="text"
                                          placeholder="HSN Code"
                                          value={item.hsnCode || ""}
                                          onChange={(e) =>
                                            handleItemChange(boxIndex, itemIndex, "hsnCode", e.target.value)
                                          }
                                          readOnly
                                          className="flex-1"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() => openHsnSearch(boxIndex, itemIndex)}
                                        >
                                          <Search className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(boxIndex)}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Item
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-[#E31E24] hover:bg-[#C71D23] text-white" disabled={loading}>
            {loading ? "Processing..." : isEdit ? "Update AWB" : "Create AWB"}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`AWB ${isEdit ? "Updated" : "Created"} Successfully`}</DialogTitle>
            <DialogDescription>
              {`The AWB has been ${isEdit ? "updated" : "created"} successfully. Click the button below to view AWB or go back to AWB Table.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2 sm:justify-center">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push(`/awb/${trackingNumber}`)}
            >
              View AWB
            </Button>
            <Button className="bg-green-600 hover:bg-green-800 text-white" onClick={() => router.push(`/awb`)}>
              Back to AWB Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search {searchType === "sender" ? "Sender" : "Receiver"}</DialogTitle>
            <DialogDescription>Search for existing customers or enter a new name</DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput
              placeholder={`Search ${searchType === "sender" ? "sender" : "receiver"} name...`}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No customers found. You can add a new one.</CommandEmpty>
              <CommandGroup heading="Customers">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.name}
                    onSelect={() => handleSelectCustomer(customer)}
                    className="cursor-pointer"
                  >
                    {customer.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowSearchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (searchType === "sender") {
                  setSenderName(searchTerm)
                } else if (searchType === "receiver") {
                  setReceiverName(searchTerm)
                }
                setShowSearchDialog(false)
              }}
              disabled={!searchTerm}
            >
              Use New Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HSN Search Dialog */}
      <HsnSearchDialog open={showHsnSearchDialog} onOpenChange={setShowHsnSearchDialog} onSelect={handleSelectHsn} />
    </div>
  )
}
