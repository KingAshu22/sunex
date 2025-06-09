"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, Minus, Trash2, Search, TruckIcon, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card"
import { Countries, countryCodeMap } from "@/app/constants/country"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export default function AWBForm({ isEdit = false, awb }) {
  const router = useRouter()

  // Clean up contact numbers from AWB data if in edit mode
  useEffect(() => {
    if (isEdit && awb) {
      // Remove country code from sender contact if present
      if (awb.sender?.contact) {
        const senderCountryCode = getCallingCode(awb.sender.country)
        if (senderCountryCode && awb.sender.contact.startsWith(senderCountryCode)) {
          setSenderContact(awb.sender.contact.substring(senderCountryCode.length).trim())
        }
      }

      // Remove country code from receiver contact if present
      if (awb.receiver?.contact) {
        const receiverCountryCode = getCallingCode(awb.receiver.country)
        if (receiverCountryCode && awb.receiver.contact.startsWith(receiverCountryCode)) {
          setReceiverContact(awb.receiver.contact.substring(receiverCountryCode.length).trim())
        }
      }
    }
  }, [isEdit, awb])

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

  // Rate fetching state
  const [showRateDialog, setShowRateDialog] = useState(false)
  const [fetchingRates, setFetchingRates] = useState(false)
  const [rates, setRates] = useState(null)
  const [selectedRate, setSelectedRate] = useState(null)
  const [selectedCourier, setSelectedCourier] = useState(null)

  // Form state
  const [date, setDate] = useState(awb?.date || Date.now())
  const [parcelType, setParcelType] = useState(awb?.parcelType || "International")
  const [staffId, setStaffId] = useState(awb?.staffId || "")
  const [invoiceNumber, setInvoiceNumber] = useState(awb?.invoiceNumber || "")
  const [trackingNumber, setTrackingNumber] = useState(awb?.trackingNumber || "")
  const [via, setVia] = useState(awb?.via || "Air Shipment")
  const [shipmentType, setShipmentType] = useState(awb?.shipmentType || "Non Document")

  //Forwarding Details
  const [forwardingNo, setForwardingNo] = useState(awb?.forwardingNo || "")
  const [forwardingLink, setForwardingLink] = useState(awb?.forwardingLink || "")

  const [shippingCurrency, setShippingCurrency] = useState(awb?.shippingCurrency || "₹")
  const [totalShippingValue, setTotalShippingValue] = useState(awb?.totalShippingValue || 0);

  // Sender details
  const [senderName, setSenderName] = useState(awb?.sender?.name || "")
  const [senderCompanyName, setSenderCompanyName] = useState(awb?.sender?.companyName || "")
  const [senderEmail, setSenderEmail] = useState(awb?.sender?.email || "")
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
  const [receiverCompanyName, setReceiverCompanyName] = useState(awb?.receiver?.companyName || "")
  const [receiverEmail, setReceiverEmail] = useState(awb?.receiver?.email || "")
  const [receiverAddress, setReceiverAddress] = useState(awb?.receiver?.address || "")
  const [receiverCountry, setReceiverCountry] = useState(awb?.receiver?.country || "")
  const [receiverZipCode, setReceiverZipCode] = useState(awb?.receiver?.zip || "")
  const [receiverContact, setReceiverContact] = useState(awb?.receiver?.contact || "")

  // Box details
  const [boxes, setBoxes] = useState(awb?.boxes || [])

  // Derived state
  const [totalChargeableWeight, setTotalChargeableWeight] = useState("")
  const [profitPercent, setProfitPercent] = useState(50)

  // Check if all required fields are filled for rate fetching
  const canFetchRates = useMemo(() => {
    return boxes.length > 0 && totalChargeableWeight && Number(totalChargeableWeight) > 0 && receiverCountry
  }, [boxes, totalChargeableWeight, receiverCountry])

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

  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchFranchiseData = async () => {
      setLoading(true)
      const userType = localStorage.getItem("userType")
      const code = localStorage.getItem("code")

      if (userType !== "admin") {
        try {
          const response = await axios.get(`/api/franchises/${code}`)
          const franchise = response.data[0] // since you use `find`, response is an array
          const rates = franchise.rates

          // Find rate for specific receiverCountry
          const matchedRate = rates.find((rate) => rate.country === receiverCountry)

          let percent
          if (matchedRate) {
            percent = matchedRate.percent
          } else {
            const restOfWorldRate = rates.find((rate) => rate.country === "Rest of World")
            percent = restOfWorldRate ? restOfWorldRate.percent : 0
          }

          setProfitPercent(percent)

          setLoading(false)
        } catch (err) {
          console.error(err)
          setError("Failed to fetch Franchise data")
          setLoading(false)
        }
      }
    }

    if (receiverCountry) {
      fetchFranchiseData()
    }
  }, [receiverCountry])

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers()
    !isEdit && getInvoiceNumber()
  }, [isEdit])

  // Auto-fill sender details when sender name changes
  useEffect(() => {
    if (senderName && !isEdit) {
      const customer = customers.find((c) => c.name === senderName)
      if (customer) {
        setSenderCompanyName(customer.companyName || "")
        setSenderEmail(customer.email || "")
        setSenderAddress(customer.address || "")
        setSenderCountry(customer.country || "India")
        setSenderZipCode(customer.zip || "")
        setSenderContact(customer.contact ? customer.contact.replace(/^\+\d+\s+/, "") : "")
        setKycType(customer.kyc?.type || "Aadhaar No -")
        setKyc(customer.kyc?.kyc || "")
        setGst(customer.gst || "")
      }
    }
  }, [senderName, customers])

  // Auto-fill receiver details when receiver name changes
  useEffect(() => {
    if (receiverName && !isEdit) {
      const customer = customers.find((c) => c.name === receiverName)
      if (customer) {
        setReceiverCompanyName(customer.companyName || "")
        setReceiverEmail(customer.email || "")
        setReceiverAddress(customer.address || "")
        setReceiverCountry(customer.country || "")
        setReceiverZipCode(customer.zip || "")
        setReceiverContact(customer.contact ? customer.contact.replace(/^\+\d+\s+/, "") : "")
      }
    }
  }, [receiverName, customers])

  // Fetch postal location data
  const fetchPostalData = async (postalCode, countryCode) => {
    try {
      const response = await axios.get(`https://api.worldpostallocations.com/pincode`, {
        params: {
          apikey: process.env.NEXT_PUBLIC_POSTAL_API_KEY,
          postalcode: postalCode,
          countrycode: countryCode,
        },
      })

      console.log("Postal data response:", response.data)

      if (response.data && response.data.status === true && response.data.result && response.data.result.length > 0) {
        return response.data.result[0] // Return the first result
      }
      return null
    } catch (error) {
      console.error("Error fetching postal data:", error)
      return null
    }
  }

  // Auto-fill sender address when zip code changes
  useEffect(() => {
    const updateSenderAddress = async () => {
      if (senderZipCode && senderZipCode.length >= 4 && senderCountry) {
        const countryCode = getCountryCode(senderCountry)
        if (!countryCode) return

        const postalData = await fetchPostalData(senderZipCode, countryCode)
        if (postalData) {
          const { postalLocation, province, district, state } = postalData
          const formattedAddress = [postalLocation, province, district, state].filter(Boolean).join(", ")

          // Only update if address is empty or user confirms
          if (!senderAddress) {
            setSenderAddress(formattedAddress)
          }
        }
      }
    }

    updateSenderAddress()
  }, [senderZipCode, senderCountry])

  // Auto-fill receiver address when zip code changes
  useEffect(() => {
    const updateReceiverAddress = async () => {
      if (receiverZipCode && receiverZipCode.length >= 4 && receiverCountry) {
        const countryCode = getCountryCode(receiverCountry)
        if (!countryCode) return

        const postalData = await fetchPostalData(receiverZipCode, countryCode)
        if (postalData) {
          const { postalLocation, province, district, state } = postalData
          const formattedAddress = [postalLocation, province, district, state].filter(Boolean).join(", ")

          // Only update if address is empty
          if (!receiverAddress) {
            setReceiverAddress(formattedAddress)
          }
        }
      }
    }

    updateReceiverAddress()
  }, [receiverZipCode, receiverCountry])

  // Calculate total chargeable weight when boxes change
  useEffect(() => {
    const totalWeight = boxes.reduce((acc, box) => {
      const chargeableWeight = Number.parseFloat(box.chargeableWeight) || 0
      return acc + chargeableWeight
    }, 0)

    setTotalChargeableWeight((totalWeight).toFixed(2).toString())

    const totalShippingValue = boxes.reduce((acc, box) => {
      return acc + box.items.reduce((itemAcc, item) => {
        const itemValue = Number.parseFloat(item.price) || 0
        const itemQuantity = Number.parseInt(item.quantity, 10) || 0
        return itemAcc + itemValue * itemQuantity
      }, 0)
    }, 0);

    setTotalShippingValue(parseFloat(totalShippingValue))
  }, [boxes])

  // Reset selected rate when weight changes
  useEffect(() => {
    setSelectedRate(null)
    setSelectedCourier(null)
    setRates(null)
  }, [totalChargeableWeight, receiverCountry])

  // Initialize selected rate and courier from AWB data when in edit mode
  useEffect(() => {
    if (isEdit && awb?.rateInfo) {
      setSelectedRate(awb.rateInfo)
      setSelectedCourier(awb.rateInfo.courier)
    }
  }, [isEdit, awb])

  // Auto-check shipping invoice checkbox if items exist
  useEffect(() => {
    if (boxes.length > 0) {
      // Check if any box has items with name, quantity, and price
      const hasItems = boxes.some(
        (box) => box.items && box.items.some((item) => item.name && item.quantity && item.price),
      )

      if (hasItems) {
        setShowItemDetails(true)
      }
    }
  }, [boxes])

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      const userType = localStorage.getItem("userType")
      const userId = localStorage.getItem("id")
      setLoading(true)
      const response = await axios.get("/api/customer", {
        headers: {
          userType,
          userId,
        },
      })
      setCustomers(response.data)
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  // Get country code from country name
  const getCountryCode = (countryName) => {
    return countryCodeMap[countryName]?.code || ""
  }

  // Get calling code from country name
  const getCallingCode = (countryName) => {
    return countryCodeMap[countryName]?.callingCode || ""
  }

  // Format contact number with country code
  const formatContactWithCountryCode = (contact, countryCode) => {
    if (!contact || !countryCode) return contact

    // Remove any existing country code if present
    let cleanContact = contact
    if (cleanContact.startsWith(countryCode)) {
      cleanContact = cleanContact.substring(countryCode.length).trim()
    }

    // Remove any non-digit characters
    cleanContact = cleanContact.replace(/[^\d]/g, "")

    // Add the country code
    return `${countryCode} ${cleanContact}`
  }

  // Get invoice number from API

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

          const dimensionalWeight = ((length * breadth * height) / 5000).toFixed(3)
          const chargeableWeightRaw = Math.max(actualWeight, dimensionalWeight);

          let chargeableWeight;

          if (chargeableWeightRaw < 20) {
            // Round to nearest 0.5 kg
            chargeableWeight = Math.ceil(chargeableWeightRaw * 2) / 2;
          } else {
            // Round to nearest 1 kg
            chargeableWeight = Math.ceil(chargeableWeightRaw);
          }

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
    if (shipmentType === "Document" && boxes.length > 0 && boxes[0]?.items?.length > 0) {
      const item = boxes[0].items[0]
      if (item.name !== "Document" || item.price !== 10 || item.hsnCode !== "482030") {
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

  // Rate fetching function
  const fetchRates = async () => {
    if (!canFetchRates) {
      toast.error("Please fill in all required fields to fetch rates")
      return
    }

    setFetchingRates(true)
    setShowRateDialog(true)

    try {
      // Fetch rates for different courier services
      const courierTypes = ["dhl", "fedex", "ups", "dtdc", "aramex", "orbit"]
      const ratePromises = courierTypes.map((type) =>
        axios
          .get("/api/rate", {
            params: {
              type,
              weight: totalChargeableWeight,
              country: receiverCountry,
              profitPercent,
            },
          })
          .then((response) => ({
            type,
            ...response.data,
            success: true,
          }))
          .catch((error) => ({
            type,
            error: error.response?.data?.error || "Failed to fetch rate",
            success: false,
          })),
      )

      const results = await Promise.all(ratePromises)
      setRates(results)
      console.log("Fetched rates:", results)
    } catch (error) {
      console.error("Error fetching rates:", error)
      toast.error("Failed to fetch rates. Please try again.")
    } finally {
      setFetchingRates(false)
    }
  }

  // Handle rate selection
  const handleSelectRate = (rate, type) => {
    setSelectedRate(rate)
    setSelectedCourier(type)
    toast.success(`Selected ${type.toUpperCase()} rate: ₹${rate.totalWithGST}`)
    setShowRateDialog(false)
  }

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userType = localStorage.getItem("userType")
      const userId = localStorage.getItem("id")

      // Format contact numbers with country codes
      const senderCountryCode = getCallingCode(senderCountry)
      const receiverCountryCode = getCallingCode(receiverCountry)

      // Make sure we're not duplicating country codes
      let formattedSenderContact = senderContact
      if (senderCountryCode && !formattedSenderContact.startsWith(senderCountryCode)) {
        formattedSenderContact = `${senderCountryCode} ${senderContact.replace(/[^\d]/g, "")}`
      }

      let formattedReceiverContact = receiverContact
      if (receiverCountryCode && !formattedReceiverContact.startsWith(receiverCountryCode)) {
        formattedReceiverContact = `${receiverCountryCode} ${receiverContact.replace(/[^\d]/g, "")}`
      }

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
        shippingCurrency,
        sender: {
          name: senderName,
          companyName: senderCompanyName,
          email: senderEmail,
          address: senderAddress,
          country: senderCountry,
          zip: senderZipCode,
          contact: formattedSenderContact,
          kyc: {
            type: kycType,
            kyc,
          },
          owner: localStorage.getItem("id"),
          gst,
        },
        receiver: {
          name: receiverName,
          companyName: receiverCompanyName,
          email: receiverEmail,
          address: receiverAddress,
          country: receiverCountry,
          zip: receiverZipCode,
          contact: formattedReceiverContact,
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
        // Add selected rate information if available
        ...(selectedRate && {
          rateInfo: {
            courier: selectedCourier,
            zone: selectedRate.zone,
            rate: selectedRate.rate,
            baseCharge: selectedRate.baseCharge,
            totalWithGST: selectedRate.totalWithGST,
            GST: selectedRate.GST,
            weight: selectedRate.weight,
          },
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

  // Get courier logo and color
  const getCourierInfo = (type) => {
    const courierInfo = {
      dhl: {
        name: "SunEx-D",
        color: "bg-yellow-400",
        textColor: "text-yellow-800",
      },
      fedex: {
        name: "SunEx-F",
        color: "bg-purple-600",
        textColor: "text-purple-50",
      },
      ups: {
        name: "SunEx-U",
        color: "bg-amber-700",
        textColor: "text-amber-50",
      },
      dtdc: {
        name: "SunEx-W",
        color: "bg-red-600",
        textColor: "text-red-50",
      },
      aramex: {
        name: "SunEx-A",
        color: "bg-red-500",
        textColor: "text-red-50",
      },
      orbit: {
        name: "SunEx-O",
        color: "bg-blue-600",
        textColor: "text-blue-50",
      },
    }

    return courierInfo[type] || { name: type.toUpperCase(), color: "bg-gray-500", textColor: "text-gray-50" }
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
              <Label htmlFor="senderCompanyName">Company Name</Label>
              <Input
                id="senderCompanyName"
                placeholder="Company Name"
                value={senderCompanyName}
                onChange={(e) => setSenderCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderEmail">Email</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="Email Address"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderZipCode">Sender Zip Code*</Label>
              <div className="relative">
                <Input
                  id="senderZipCode"
                  type="text"
                  placeholder="Sender Zip Code"
                  value={senderZipCode}
                  onChange={(e) => setSenderZipCode(e.target.value)}
                  required
                  className="pr-10"
                />
                {senderZipCode && senderZipCode.length >= 5 && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-xs text-green-600">Lookup</span>
                  </div>
                )}
              </div>
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
              <Label htmlFor="senderContact">Sender Contact*</Label>
              <div className="flex">
                {senderCountry && (
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-sm text-gray-600">
                    {getCallingCode(senderCountry)}
                  </div>
                )}
                <Input
                  id="senderContact"
                  type="text"
                  placeholder="Contact Number"
                  value={senderContact}
                  onChange={(e) => setSenderContact(e.target.value)}
                  required
                  className={senderCountry ? "rounded-l-none" : ""}
                />
              </div>
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
              <Label htmlFor="receiverCompanyName">Company Name</Label>
              <Input
                id="receiverCompanyName"
                placeholder="Company Name"
                value={receiverCompanyName}
                onChange={(e) => setReceiverCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiverEmail">Email</Label>
              <Input
                id="receiverEmail"
                type="email"
                placeholder="Email Address"
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
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
              <div className="relative">
                <Input
                  id="receiverZipCode"
                  type="text"
                  placeholder="Receiver Zip Code"
                  value={receiverZipCode}
                  onChange={(e) => setReceiverZipCode(e.target.value)}
                  required
                  className="pr-10"
                />
                {receiverZipCode && receiverZipCode.length >= 5 && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-xs text-green-600">Lookup</span>
                  </div>
                )}
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
              <Label htmlFor="receiverContact">Receiver Contact*</Label>
              <div className="flex">
                {receiverCountry && (
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-sm text-gray-600">
                    {getCallingCode(receiverCountry)}
                  </div>
                )}
                <Input
                  id="receiverContact"
                  type="text"
                  placeholder="Contact Number"
                  value={receiverContact}
                  onChange={(e) => setReceiverContact(e.target.value)}
                  required
                  className={receiverCountry ? "rounded-l-none" : ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Box Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-[#232C65]">Box Details</CardTitle>
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
                                      <div className="space-y-2">
                                        <Label>Shipping Currency</Label>
                                        <Select value={shippingCurrency} onValueChange={setShippingCurrency}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select Shipping Currency" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="₹">₹</SelectItem>
                                            <SelectItem value="$">$</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
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

            {/* Rate Fetching Button */}
            {canFetchRates && (
              <div className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">Ready to fetch shipping rates?</h3>
                    <p className="text-sm text-muted-foreground">
                      Get quotes from multiple carriers based on your package details
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={fetchRates}
                    className="bg-[#232C65] hover:bg-[#1a2150]"
                    disabled={fetchingRates}
                  >
                    <TruckIcon className="h-4 w-4 mr-2" />
                    {fetchingRates ? "Fetching Rates..." : "Fetch Shipping Rates"}
                  </Button>
                </div>

                {selectedRate && selectedCourier && (
                  <div className="mt-4 p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium">Selected Rate: {getCourierInfo(selectedCourier).name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={cn(
                              "px-2 py-1",
                              getCourierInfo(selectedCourier).color,
                              getCourierInfo(selectedCourier).textColor,
                            )}
                          >
                            {getCourierInfo(selectedCourier).name}
                          </Badge>
                          <span className="text-sm">Zone: {selectedRate.zone}</span>
                          <span className="text-sm font-semibold">₹{selectedRate.totalWithGST}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <CardFooter className="flex flex-row justify-between">
          <div className="text-sm font-medium bg-[#0ABAB5] text-white rounded-lg p-2">Total Chargeable Weight: {totalChargeableWeight} kg</div>
          <div className="text-sm font-medium bg-[#4DA8DA] text-white rounded-lg p-2">Total Shipping Value: {shippingCurrency} {totalShippingValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
        </CardFooter>
        <div className="flex justify-end">
          <Button type="submit" className="bg-[#E31E24] hover:bg-[#C71D23] text-white">
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

      {/* Rate Selection Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Shipping Rate</DialogTitle>
            <DialogDescription>
              Compare rates from different carriers for your {totalChargeableWeight}kg package to {receiverCountry}
            </DialogDescription>
          </DialogHeader>

          {fetchingRates ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
          ) : rates ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="all">All Carriers</TabsTrigger>
                <TabsTrigger value="available">Available Carriers</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {rates.map((rate) => (
                  <Card key={rate.type} className={cn("overflow-hidden transition-all", !rate.success && "opacity-60")}>
                    <CardHeader className={cn("py-3", getCourierInfo(rate.type).color)}>
                      <CardTitle
                        className={cn("text-lg flex justify-between items-center", getCourierInfo(rate.type).textColor)}
                      >
                        <span>{getCourierInfo(rate.type).name}</span>
                        {rate.success && (
                          <Badge variant="outline" className="bg-white text-black">
                            Zone {rate.zone}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4">
                      {rate.success ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Sub Total</p>
                              <p className="text-lg font-semibold">
                                ₹{rate.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">GST (18%)</p>
                              <p className="text-lg font-semibold">
                                ₹{Math.round(rate.GST).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total</p>
                              <p className="text-xl font-bold text-[#232C65]">
                                ₹{rate.totalWithGST.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleSelectRate(rate, rate.type)}
                              className={cn(
                                "mt-2",
                                getCourierInfo(rate.type).color,
                                getCourierInfo(rate.type).textColor,
                              )}
                            >
                              Select {getCourierInfo(rate.type).name}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2">
                          <p className="text-red-500">{rate.error || "Service unavailable for this route"}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="available" className="space-y-4">
                {rates.filter((r) => r.success).length > 0 ? (
                  rates
                    .filter((r) => r.success)
                    .map((rate) => (
                      <Card key={rate.type} className="overflow-hidden">
                        <CardHeader className={cn("py-3", getCourierInfo(rate.type).color)}>
                          <CardTitle
                            className={cn(
                              "text-lg flex justify-between items-center",
                              getCourierInfo(rate.type).textColor,
                            )}
                          >
                            <span>{getCourierInfo(rate.type).name}</span>
                            <Badge variant="outline" className="bg-white text-black">
                              Zone {rate.zone}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Sub Total</p>
                                <p className="text-lg font-semibold">
                                  ₹{rate.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">GST (18%)</p>
                                <p className="text-lg font-semibold">
                                  ₹{Math.round(rate.GST).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-xl font-bold text-[#232C65]">₹{rate.totalWithGST}</p>
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={() => handleSelectRate(rate, rate.type)}
                                className={cn(
                                  "mt-2",
                                  getCourierInfo(rate.type).color,
                                  getCourierInfo(rate.type).textColor,
                                )}
                              >
                                Select {getCourierInfo(rate.type).name}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No carriers available for this route and weight</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Click "Fetch Shipping Rates" to see available options</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
