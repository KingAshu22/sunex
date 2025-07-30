"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, Minus, Search, TruckIcon, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Check, ChevronsUpDown } from "lucide-react"

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

  const [senderCountryOpen, setSenderCountryOpen] = useState(false)
  const [receiverCountryOpen, setReceiverCountryOpen] = useState(false)

  // Rate fetching state
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
  const [refCode, setRefCode] = useState(awb?.refCode || localStorage.getItem("code") || "");

  //Forwarding Details
  const [forwardingNo, setForwardingNo] = useState(awb?.forwardingNo || "")
  const [forwardingLink, setForwardingLink] = useState(awb?.forwardingLink || "")

  const [shippingCurrency, setShippingCurrency] = useState(awb?.shippingCurrency || "₹")
  const [totalShippingValue, setTotalShippingValue] = useState(awb?.totalShippingValue || 0)

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
  const [kycDocument, setKycDocument] = useState(awb?.sender?.kyc?.document || "")
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
  const [boxes, setBoxes] = useState(awb?.boxes || []);
  const [ourBoxes, setOurBoxes] = useState(awb?.ourBoxes || []);
  const [vendorBoxes, setVendorBoxes] = useState(awb?.vendorBoxes || []);

  // Derived state
  const [totalChargeableWeight, setTotalChargeableWeight] = useState("")
  const [profitPercent, setProfitPercent] = useState(50)

  // Calculate total weights
  const totalWeights = useMemo(() => {
    const totalActual = boxes.reduce((acc, box) => {
      const actualWeight = Number.parseFloat(box.actualWeight) || 0
      return acc + actualWeight
    }, 0)

    const totalDimensional = boxes.reduce((acc, box) => {
      const dimensionalWeight = Number.parseFloat(box.dimensionalWeight) || 0
      return acc + dimensionalWeight
    }, 0)

    const totalChargeable = boxes.reduce((acc, box) => {
      const chargeableWeight = Number.parseFloat(box.chargeableWeight) || 0
      return acc + chargeableWeight
    }, 0)

    return {
      actual: totalActual.toFixed(2),
      dimensional: totalDimensional.toFixed(3),
      chargeable: totalChargeable.toFixed(2),
    }
  }, [boxes])

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
        setKycDocument(customer.kyc?.document || "")
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

    setTotalChargeableWeight(totalWeight.toFixed(2).toString())

    const totalShippingValue = boxes.reduce((acc, box) => {
      return (
        acc +
        box.items.reduce((itemAcc, item) => {
          const itemValue = Number.parseFloat(item.price) || 0
          const itemQuantity = Number.parseInt(item.quantity, 10) || 0
          return itemAcc + itemValue * itemQuantity
        }, 0)
      )
    }, 0)

    setTotalShippingValue(Number.parseFloat(totalShippingValue))
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
          const chargeableWeightRaw = Math.max(actualWeight, dimensionalWeight)

          let chargeableWeight

          if (chargeableWeightRaw < 20) {
            // Round to nearest 0.5 kg
            chargeableWeight = Math.ceil(chargeableWeightRaw * 2) / 2
          } else {
            // Round to nearest 1 kg
            chargeableWeight = Math.ceil(chargeableWeightRaw)
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

    try {
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
        refCode,
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
            document: kycDocument,
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

  // Enhanced HSN auto-fill function with bidirectional support
  const handleHsnCodeChange = async (boxIndex, itemIndex, hsnCode) => {
    // Update the HSN code first
    setBoxes((prevBoxes) => {
      const updatedBoxes = [...prevBoxes]
      updatedBoxes[boxIndex].items[itemIndex] = {
        ...updatedBoxes[boxIndex].items[itemIndex],
        hsnCode: hsnCode,
      }
      return updatedBoxes
    })

    // If HSN code is provided and item name is empty, try to fetch item name
    if (hsnCode && hsnCode.length >= 4) {
      try {
        // First check mock data
        const mockItem = mockHsnData.find((item) => item.code === hsnCode)
        if (mockItem) {
          setBoxes((prevBoxes) => {
            const updatedBoxes = [...prevBoxes]
            if (!updatedBoxes[boxIndex].items[itemIndex].name) {
              updatedBoxes[boxIndex].items[itemIndex] = {
                ...updatedBoxes[boxIndex].items[itemIndex],
                name: mockItem.item,
              }
            }
            return updatedBoxes
          })
          return
        }

        // If not found in mock data, try API
        const response = await axios.get(`/api/hsn?code=${encodeURIComponent(hsnCode)}`)
        if (response.data && response.data.length > 0) {
          const hsnItem = response.data[0]
          setBoxes((prevBoxes) => {
            const updatedBoxes = [...prevBoxes]
            if (!updatedBoxes[boxIndex].items[itemIndex].name) {
              updatedBoxes[boxIndex].items[itemIndex] = {
                ...updatedBoxes[boxIndex].items[itemIndex],
                name: hsnItem.item,
              }
            }
            return updatedBoxes
          })
        }
      } catch (error) {
        console.error("Error fetching item by HSN code:", error)
        // Silently fail - user can still manually enter item name
      }
    }
  }

  // Pin code validation - remove spaces
  const handlePinCodeChange = (value, setter) => {
    const cleanValue = value.replace(/\s/g, "")
    setter(cleanValue)
  }

  return (
    <div className="container mx-auto text-xs">
      <h1 className="text-lg font-bold text-center text-[#232C65] -mt-4">{isEdit ? "Edit Booking" : "New Booking"}</h1>

      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Basic Details */}
        <Card className="border-gray-200 -mt-1">
          <CardHeader className="-mt-4">
            <CardTitle className="text-sm text-[#232C65]">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-8 gap-1 -my-6">
            <div className="space-y-1">
              <Label htmlFor="invoiceNumber" className="text-xs">
                Sr No:
              </Label>
              <Input
                id="invoiceNumber"
                type="text"
                placeholder="Invoice No."
                value={invoiceNumber}
                readOnly
                className="h-6 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trackingNumber" className="text-xs">
                Tracking No:
              </Label>
              <Input
                id="trackingNumber"
                type="number"
                placeholder="Tracking No."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="h-6 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-6 text-xs",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {date ? format(new Date(date), "dd/MM/yy") : <span>Date</span>}
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
            <div className="space-y-1">
              <Label className="text-xs">Parcel Type</Label>
              <Select value={parcelType} onValueChange={setParcelType}>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Domestic">Domestic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Via</Label>
              <Select value={via} onValueChange={setVia}>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="Via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air Shipment">Air Shipment</SelectItem>
                  <SelectItem value="Cargo">Cargo</SelectItem>
                  <SelectItem value="Roadways">Roadways</SelectItem>
                  <SelectItem value="Railways">Railways</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Shipment Type</Label>
              <Select value={shipmentType} onValueChange={setShipmentType}>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Document">Document</SelectItem>
                  <SelectItem value="Non Document">Non Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
                <Label htmlFor="receiverCountry" className="text-xs">
                  Country*
                </Label>
                <Popover open={receiverCountryOpen} onOpenChange={setReceiverCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={receiverCountryOpen}
                      className="w-full justify-between h-8 text-xs"
                    >
                      {receiverCountry || "Select country..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search country..." className="text-xs" />
                      <CommandList>
                        <CommandEmpty className="text-xs">No country found.</CommandEmpty>
                        <CommandGroup>
                          {Countries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                setReceiverCountry(currentValue === receiverCountry ? "" : currentValue)
                                setReceiverCountryOpen(false)
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  receiverCountry === country ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
              <Label htmlFor="refCode" className="text-xs">
                Reference Code
              </Label>
              <Input
                id="refCode"
                type="number"
                placeholder="Reference Code"
                required
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                className="h-6 text-xs"
              />
            </div>
            {isEdit && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="forwardingNo" className="text-xs">
                    Forwarding No:
                  </Label>
                  <Input
                    id="forwardingNo"
                    type="text"
                    placeholder="Forwarding No."
                    value={forwardingNo}
                    onChange={(e) => setForwardingNo(e.target.value)}
                    className="h-6 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="forwardingLink" className="text-xs">
                    Forwarding Link:
                  </Label>
                  <Input
                    id="forwardingLink"
                    type="text"
                    placeholder="Forwarding Link."
                    value={forwardingLink}
                    onChange={(e) => setForwardingLink(e.target.value)}
                    className="h-6 text-xs"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Box Details and Rates Section */}
        <div className="grid grid-cols-6 gap-2">
          {/* Box Details - 80% width (4 columns) */}
          <div className="col-span-4">
            <Card className="border-gray-200">
              <CardHeader className="-mt-6">
                <CardTitle className="text-sm text-[#232C65]">Box Details</CardTitle>
              </CardHeader>
              <CardContent className="-my-6">
                {/* Box Count Input with Total Weights */}
                <div className="grid grid-cols-5 gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="boxCount" className="text-xs">
                      How many boxes?
                    </Label>
                    <Input
                      id="boxCount"
                      type="number"
                      placeholder="Number of boxes"
                      value={boxCount}
                      onChange={(e) => setBoxCount(e.target.value)}
                      className="h-6 text-xs"
                    />
                  </div>
                  <Button type="button" onClick={generateBoxes} className="h-6 text-xs px-2">
                    Generate
                  </Button>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Actual Weight</Label>
                    <div className="h-6 px-2 py-1 bg-blue-50 border rounded text-xs font-medium text-blue-700">
                      {totalWeights.actual} kg
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Dimensional Weight</Label>
                    <div className="h-6 px-2 py-1 bg-green-50 border rounded text-xs font-medium text-green-700">
                      {totalWeights.dimensional} kg
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Chargeable Weight</Label>
                    <div className="h-6 px-2 py-1 bg-orange-50 border rounded text-xs font-medium text-orange-700">
                      {totalWeights.chargeable} kg
                    </div>
                  </div>
                </div>

                {/* Box Details Table */}
                {boxes.length > 0 && (
                  <div className="space-y-2 pb-1">
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-7">
                            <TableHead className="text-xs p-1 whitespace-nowrap">Box No</TableHead>
                            <TableHead className="text-xs p-1">Actual Weight (kg)</TableHead>
                            <TableHead className="text-xs p-1">Length (cm)</TableHead>
                            <TableHead className="text-xs p-1">Breadth (cm)</TableHead>
                            <TableHead className="text-xs p-1">Height (cm)</TableHead>
                            <TableHead className="text-xs p-1">Dimensional Weight</TableHead>
                            <TableHead className="text-xs p-1">Chargeable Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {boxes.map((box, index) => (
                            <TableRow key={index} className="h-7">
                              <TableCell className="text-xs p-1 font-medium">{index + 1}</TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  value={box.actualWeight}
                                  onChange={(e) => handleBoxChange(index, "actualWeight", e.target.value)}
                                  className="h-5 text-xs"
                                  placeholder="Weight"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  value={box.length}
                                  onChange={(e) => handleBoxChange(index, "length", e.target.value)}
                                  className="h-5 text-xs"
                                  placeholder="Length"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  value={box.breadth}
                                  onChange={(e) => handleBoxChange(index, "breadth", e.target.value)}
                                  className="h-5 text-xs"
                                  placeholder="Breadth"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  value={box.height}
                                  onChange={(e) => handleBoxChange(index, "height", e.target.value)}
                                  className="h-5 text-xs"
                                  placeholder="Height"
                                />
                              </TableCell>
                              <TableCell className="text-xs p-1">{box.dimensionalWeight || "0.000"}</TableCell>
                              <TableCell className="text-xs p-1 font-medium">{box.chargeableWeight || "0"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Get Rate Button below table */}
                    {canFetchRates && (
                      <Button
                        type="button"
                        onClick={fetchRates}
                        className="w-full bg-[#232C65] hover:bg-[#1a2150] h-6 text-xs"
                        disabled={fetchingRates}
                      >
                        <TruckIcon className="h-3 w-3 mr-1" />
                        {fetchingRates ? "Fetching..." : "Get Rate"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Available Rates - 20% width (2 columns) */}
          <div className="col-span-2">
            <Card className="border-gray-200">
              <CardHeader className="-my-6">
                <CardTitle className="text-sm text-[#232C65]">Available Rates<span className="text-xs text-gray-600 mt-1">  (Including GST)</span></CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {fetchingRates ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-2 border rounded-lg animate-pulse">
                        <div className="h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : rates && rates.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-1">
                          <TableHead className="text-xs">Service</TableHead>
                          <TableHead className="text-xs">Company</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Amount/kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rates
                          .filter((rate) => rate.success)
                          .map((rate) => (
                            <TableRow
                              key={rate.type}
                              className={cn(
                                "h-6 cursor-pointer transition-all hover:bg-gray-50",
                                selectedCourier === rate.type ? "bg-green-50" : "",
                              )}
                              onClick={() => handleSelectRate(rate, rate.type)}
                            >
                              <TableCell className="text-xs p-1">
                                <div className="flex items-center gap-1">
                                  {selectedCourier === rate.type && <CheckCircle className="h-3 w-3 text-green-600" />}
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      getCourierInfo(rate.type).color,
                                      getCourierInfo(rate.type).textColor,
                                    )}
                                  >
                                    {getCourierInfo(rate.type).name}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs p-1 uppercase">{rate.type}</TableCell>
                              <TableCell className="text-xs p-1 font-semibold">₹{rate.totalWithGST}</TableCell>
                              <TableCell className="text-xs p-1">
                                ₹{(rate.totalWithGST / Number.parseFloat(totalChargeableWeight || 1)).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : selectedRate && selectedCourier ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-6">
                          <TableHead className="text-xs p-1">Service</TableHead>
                          <TableHead className="text-xs p-1">Amount</TableHead>
                          <TableHead className="text-xs p-1">Amount/kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="h-6 bg-green-50">
                          <TableCell className="text-xs p-1">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getCourierInfo(selectedCourier).color,
                                  getCourierInfo(selectedCourier).textColor,
                                )}
                              >
                                {getCourierInfo(selectedCourier).name}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs p-1 font-semibold">₹{selectedRate.totalWithGST}</TableCell>
                          <TableCell className="text-xs p-1">
                            ₹{(selectedRate.totalWithGST / Number.parseFloat(totalChargeableWeight || 1)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">Click on Get Rate to see available services</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sender and Receiver Details - 50-50 width */}
        <div className="grid grid-cols-2 gap-2">
          {/* Sender Details */}
          <Card className="border-gray-200">
            <CardHeader className="-my-6">
              <CardTitle className="text-sm text-[#232C65]">Sender Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-1 -my-4">
              <div className="space-y-1">
                <Label htmlFor="senderName" className="text-xs">
                  Sender Name*
                </Label>
                <div className="flex gap-1">
                  <Input
                    id="senderName"
                    placeholder="Sender Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                    className="flex-1 h-6 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openSearch("sender")}
                    className="h-6 w-6 p-0"
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="senderCompanyName" className="text-xs">
                  Company Name
                </Label>
                <Input
                  id="senderCompanyName"
                  placeholder="Company Name"
                  value={senderCompanyName}
                  onChange={(e) => setSenderCompanyName(e.target.value)}
                  className="h-6 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="senderEmail" className="text-xs">
                  Email
                </Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="Email Address"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="h-6 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="senderZipCode" className="text-xs">
                  Zip Code*
                </Label>
                <div className="relative">
                  <Input
                    id="senderZipCode"
                    type="text"
                    placeholder="Zip Code"
                    value={senderZipCode}
                    onChange={(e) => handlePinCodeChange(e.target.value, setSenderZipCode)}
                    required
                    className="pr-6 h-6 text-xs"
                  />
                  {senderZipCode && senderZipCode.length >= 5 && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                      <span className="text-xs text-green-600">✓</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="senderCountry" className="text-xs">
                  Country*
                </Label>
                <Popover open={senderCountryOpen} onOpenChange={setSenderCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={senderCountryOpen}
                      className="w-full justify-between h-6 text-xs"
                    >
                      {senderCountry || "Select country..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search country..." className="text-xs" />
                      <CommandList>
                        <CommandEmpty className="text-xs">No country found.</CommandEmpty>
                        <CommandGroup>
                          {Countries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                setSenderCountry(currentValue === senderCountry ? "" : currentValue)
                                setSenderCountryOpen(false)
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn("mr-2 h-3 w-3", senderCountry === country ? "opacity-100" : "opacity-0")}
                              />
                              {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label htmlFor="senderContact" className="text-xs">
                  Contact*
                </Label>
                <div className="flex">
                  {senderCountry && (
                    <div className="flex items-center px-1 border border-r-0 rounded-l-md bg-gray-50 text-xs text-gray-600">
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
                    className={cn("h-6 text-xs", senderCountry ? "rounded-l-none" : "")}
                  />
                </div>
              </div>
              <div className="space-y-1 col-span-3">
                <Label htmlFor="senderAddress" className="text-xs">
                  Address*
                </Label>
                <Textarea
                  id="senderAddress"
                  placeholder="Sender Address"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  rows={2}
                  required
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KYC Type*</Label>
                <Select value={kycType} onValueChange={setKycType} required>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="KYC Type" />
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
              <div className="space-y-1">
                <Label htmlFor="kyc" className="text-xs">
                  KYC*
                </Label>
                <Input
                  id="kyc"
                  type="text"
                  placeholder="KYC"
                  value={kyc}
                  onChange={(e) => setKyc(e.target.value)}
                  required
                  className="h-6 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="kycDocument" className="text-xs">
                  KYC Document*
                </Label>
                <Input
                  id="kycDocument"
                  type="text"
                  placeholder="KYC Document"
                  value={kycDocument}
                  onChange={(e) => setKycDocument(e.target.value)}
                  required
                  className="h-6 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gst" className="text-xs">
                  GST
                </Label>
                <Input
                  id="gst"
                  type="text"
                  placeholder="GST No"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="h-6 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Receiver Details */}
          <Card className="border-gray-200">
            <CardHeader className="-my-6">
              <CardTitle className="text-sm text-[#232C65]">Receiver Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-1 -my-4">
              <div className="space-y-1">
                <Label htmlFor="receiverName" className="text-xs">
                  Receiver Name*
                </Label>
                <div className="flex gap-1">
                  <Input
                    id="receiverName"
                    placeholder="Receiver Name"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    required
                    className="flex-1 h-6 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openSearch("receiver")}
                    className="h-6 w-6 p-0"
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="receiverCompanyName" className="text-xs">
                  Company Name
                </Label>
                <Input
                  id="receiverCompanyName"
                  placeholder="Company Name"
                  value={receiverCompanyName}
                  onChange={(e) => setReceiverCompanyName(e.target.value)}
                  className="h-6 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receiverEmail" className="text-xs">
                  Email
                </Label>
                <Input
                  id="receiverEmail"
                  type="email"
                  placeholder="Email Address"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="h-6 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receiverZipCode" className="text-xs">
                  Zip Code*
                </Label>
                <div className="relative">
                  <Input
                    id="receiverZipCode"
                    type="text"
                    placeholder="Zip Code"
                    value={receiverZipCode}
                    onChange={(e) => handlePinCodeChange(e.target.value, setReceiverZipCode)}
                    required
                    className="pr-6 h-6 text-xs"
                  />
                  {receiverZipCode && receiverZipCode.length >= 5 && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                      <span className="text-xs text-green-600">✓</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="receiverContact" className="text-xs">
                  Contact*
                </Label>
                <div className="flex">
                  {receiverCountry && (
                    <div className="flex items-center px-1 border border-r-0 rounded-l-md bg-gray-50 text-xs text-gray-600">
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
                    className={cn("h-6 text-xs", receiverCountry ? "rounded-l-none" : "")}
                  />
                </div>
              </div>
              <div className="space-y-1 col-span-3">
                <Label htmlFor="receiverAddress" className="text-xs">
                  Address*
                </Label>
                <Textarea
                  id="receiverAddress"
                  placeholder="Receiver Address"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  rows={2}
                  required
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Invoice */}
        {boxes.length > 0 && (
          <Card className="border-gray-200">
            <CardHeader className="-my-6">
              <CardTitle className="text-sm text-[#232C65]">Shipping Invoice</CardTitle>
            </CardHeader>
            <CardContent className="-my-4">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox id="createShippingInvoice" checked={showItemDetails} onCheckedChange={setShowItemDetails} />
                <Label htmlFor="createShippingInvoice" className="font-medium text-xs">
                  Create Shipping Invoice?
                </Label>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <Select value={shippingCurrency} onValueChange={setShippingCurrency}>
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="₹">₹</SelectItem>
                          <SelectItem value="$">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                      <div className="text-xs font-medium bg-[#4DA8DA] text-white rounded-lg p-1">
            Total Shipping Value: {shippingCurrency}{" "}
            {totalShippingValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
              </div>

              {showItemDetails && (
                <div className="space-y-2 -my-2">
                  {boxes.map((box, boxIndex) => (
                    <div key={`items-${boxIndex}`} className="border border-gray-100">
                      <CardHeader className="-my-6">
                        <CardTitle className="text-sm text-[#232C65]">Box {boxIndex + 1} Items</CardTitle>
                      </CardHeader>
                      <CardContent className="-my-4">
                        {/* Items */}
                        <div className="space-y-1">
                          {box.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="border-b-2 -my-4">
                              <CardHeader className="flex flex-row items-center justify-between -my-6">
                              </CardHeader>
                              <CardContent className="-my-4">
                                <div className="grid grid-cols-12 gap-1">
                                  {/* Quantity */}
                                  <div className="col-span-2">
                                    {itemIndex == 0 && <Label htmlFor={`itemNo-${boxIndex}-${itemIndex}`} className="text-xs">
                                      Item No.
                                    </Label>}
                                    <Input
                                      id={`itemNo-${boxIndex}-${itemIndex}`}
                                      type="number"
                                      placeholder="itemNo"
                                      value={itemIndex + 1}
                                      onChange={(e) =>
                                        handleItemChange(boxIndex, itemIndex, "quantity", e.target.value)
                                      }
                                      required={showItemDetails}
                                      className="h-6 text-xs"
                                    />
                                  </div>
                                  {/* Item Name - Take more space */}
                                  <div className="col-span-3">
                                    {itemIndex == 0 && <Label htmlFor={`itemName-${boxIndex}-${itemIndex}`} className="text-xs">
                                      Name*
                                    </Label>}
                                    <ItemNameAutocomplete
                                      id={`itemName-${boxIndex}-${itemIndex}`}
                                      value={item.name || ""}
                                      onChange={(value) => handleItemChange(boxIndex, itemIndex, "name", value)}
                                      onHsnSelect={(hsnItem) => {
                                        handleItemChange(boxIndex, itemIndex, "hsnCode", hsnItem.code)
                                      }}
                                      required={showItemDetails}
                                      className="h-6 text-xs"
                                    />
                                  </div>

                                  {/* Quantity */}
                                  <div className="col-span-2">
                                    {itemIndex == 0 && <Label htmlFor={`itemQuantity-${boxIndex}-${itemIndex}`} className="text-xs">
                                      Qty*
                                    </Label>}
                                    <Input
                                      id={`itemQuantity-${boxIndex}-${itemIndex}`}
                                      type="number"
                                      placeholder="Qty"
                                      value={item.quantity || ""}
                                      onChange={(e) =>
                                        handleItemChange(boxIndex, itemIndex, "quantity", e.target.value)
                                      }
                                      required={showItemDetails}
                                      className="h-6 text-xs"
                                    />
                                  </div>

                                  {/* Price */}
                                  <div className="col-span-2">
                                    {itemIndex == 0 && <Label htmlFor={`itemPrice-${boxIndex}-${itemIndex}`} className="text-xs">
                                      Price*
                                    </Label>}
                                    <Input
                                      id={`itemPrice-${boxIndex}-${itemIndex}`}
                                      type="number"
                                      placeholder="Price"
                                      value={item.price || ""}
                                      onChange={(e) => handleItemChange(boxIndex, itemIndex, "price", e.target.value)}
                                      required={showItemDetails}
                                      className="h-6 text-xs"
                                    />
                                  </div>

                                  {/* HSN Code */}
                                  <div className="col-span-2">
                                    {itemIndex == 0 && <Label htmlFor={`hsnCode-${boxIndex}-${itemIndex}`} className="text-xs">
                                      HSN
                                    </Label>}
                                    <div className="flex gap-1">
                                      <Input
                                        id={`hsnCode-${boxIndex}-${itemIndex}`}
                                        type="text"
                                        placeholder="HSN"
                                        value={item.hsnCode || ""}
                                        onChange={(e) => handleHsnCodeChange(boxIndex, itemIndex, e.target.value)}
                                        className="flex-1 h-6 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openHsnSearch(boxIndex, itemIndex)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Search className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {itemIndex > 0 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeItem(boxIndex, itemIndex)}
                                    className="h-5 text-xs px-1 mt-1 r-0"
                                  >
                                    <Minus className="h-3 w-3 col-span-2" />
                                    Remove
                                  </Button>
                                )}
                                </div>
                              </CardContent>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(boxIndex)}
                            className="h-5 text-xs px-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <div className="flex justify-end">
          <Button type="submit" className="bg-[#E31E24] hover:bg-[#C71D23] text-white h-6 text-xs px-3">
            {loading ? "Processing..." : isEdit ? "Update" : "Submit"}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{`AWB ${isEdit ? "Updated" : "Created"} Successfully`}</DialogTitle>
            <DialogDescription className="text-xs">
              {`The AWB has been ${isEdit ? "updated" : "created"} successfully. Click the button below to view AWB or go back to AWB Table.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2 sm:justify-center">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-6 text-xs px-2"
              onClick={() => router.push(`/shipping-and-label/${trackingNumber}`)}
            >
              Print
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-800 text-white h-6 text-xs px-2"
              onClick={() => router.push(`/awb`)}
            >
              Back to AWB Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Search {searchType === "sender" ? "Sender" : "Receiver"}</DialogTitle>
            <DialogDescription className="text-xs">Search for existing customers or enter a new name</DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput
              placeholder={`Search ${searchType === "sender" ? "sender" : "receiver"} name...`}
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="text-xs"
            />
            <CommandList>
              <CommandEmpty className="text-xs">No customers found. You can add a new one.</CommandEmpty>
              <CommandGroup heading="Customers">
                {filteredCustomers.map((customer) => (
                  <CommandItem
                    key={customer.name}
                    onSelect={() => handleSelectCustomer(customer)}
                    className="cursor-pointer text-xs"
                  >
                    {customer.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowSearchDialog(false)} className="h-6 text-xs px-2">
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
              className="h-6 text-xs px-2"
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
