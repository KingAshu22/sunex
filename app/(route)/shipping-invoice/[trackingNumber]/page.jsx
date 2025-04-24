"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

export default function ShippingInvoicePage() {
    const { trackingNumber } = useParams()
    const [awbData, setAwbData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const printableAreaRef = useRef(null)
    const [copies, setCopies] = useState(1)

    useEffect(() => {
        const fetchAWBData = async () => {
            console.log(`AWB fetching data ${trackingNumber}`)
            setLoading(true)
            try {
                const response = await axios.get(`/api/awb/${trackingNumber}`)
                setAwbData(response.data[0])
                setLoading(false)
            } catch (err) {
                setError("Failed to fetch AWB data")
                setLoading(false)
            }
        }

        if (trackingNumber) {
            fetchAWBData()
        }
    }, [trackingNumber])

    const handlePrint = () => {
        const printContent = printableAreaRef.current.innerHTML
        const originalContent = document.body.innerHTML

        // Create multiple copies based on the copies state
        let allCopies = ""
        for (let i = 0; i < copies; i++) {
            allCopies += `<div id="printableArea" class="printableArea" style="${i > 0 ? "margin-top: 5mm;" : ""}">${printContent}</div>`
            // Don't add page break after the last copy
            if (i < copies - 1) {
                allCopies += '<div style="page-break-after: always;"></div>'
            }
        }

        document.body.innerHTML = `
            <style>
                @page {
                    size: A4;
                }
                #printableArea {
                    border: 1px solid grey;
                    border-radius: 16px;
                }
                body {
                    margin: 2.5%;
                    padding: 1%;
                    width: 95%;
                    font-family: Arial, sans-serif;
                }
                .printableArea {
                    border: 1px solid grey;
                    border-radius: 16px;
                    margin-bottom: 20px;
                    padding: 1%;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding-left: 2px;
                    padding-right: 2px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .invoice-title {
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .address-box {
                    border: 1px solid #ddd;
                    padding: 2px;
                    margin-bottom: 20px;
                }
                .signature-area {
                    margin-top: 30px;
                    text-align: right;
                }
                .footer-text {
                    margin-top: 20px;
                    font-style: italic;
                    text-align: center;
                }
            </style>
            ${allCopies}
        `

        window.print()
        document.body.innerHTML = originalContent
        window.location.reload()
    }

    // Function to convert number to words
    const numberToWords = (num) => {
        const units = [
            "",
            "One",
            "Two",
            "Three",
            "Four",
            "Five",
            "Six",
            "Seven",
            "Eight",
            "Nine",
            "Ten",
            "Eleven",
            "Twelve",
            "Thirteen",
            "Fourteen",
            "Fifteen",
            "Sixteen",
            "Seventeen",
            "Eighteen",
            "Nineteen",
        ]
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

        if (num === 0) return "Zero"

        const convertLessThanOneThousand = (num) => {
            if (num === 0) return ""
            if (num < 20) return units[num]

            const digit = num % 10
            if (num < 100) return tens[Math.floor(num / 10)] + (digit ? " " + units[digit] : "")

            return units[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convertLessThanOneThousand(num % 100) : "")
        }

        let words = ""
        let chunk = 0

        chunk = Math.floor(num / 10000000)
        if (chunk > 0) {
            words += convertLessThanOneThousand(chunk) + " Crore "
            num %= 10000000
        }

        chunk = Math.floor(num / 100000)
        if (chunk > 0) {
            words += convertLessThanOneThousand(chunk) + " Lakh "
            num %= 100000
        }

        chunk = Math.floor(num / 1000)
        if (chunk > 0) {
            words += convertLessThanOneThousand(chunk) + " Thousand "
            num %= 1000
        }

        if (num > 0) {
            words += convertLessThanOneThousand(num)
        }

        return words.trim()
    }

    // Calculate total amount
    const calculateTotal = () => {
        if (!awbData || !awbData.boxes) return 0

        let total = 0
        awbData.boxes.forEach((box) => {
            box.items.forEach((item) => {
                total += Number(item.price) * Number(item.quantity)
            })
        })

        return total
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-indigo-50 to-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-indigo-50 to-white min-h-screen">
                <h1 className="text-4xl font-bold mb-8 text-center text-red-600">Error</h1>
                <p className="text-center text-xl">{error}</p>
            </div>
        )
    }

    if (!awbData) {
        return (
            <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-indigo-50 to-white min-h-screen">
                <h1 className="text-4xl font-bold mb-8 text-center text-indigo-800">No Data Found</h1>
                <p className="text-center text-xl">No tracking information found for the given tracking number.</p>
            </div>
        )
    }

    const totalAmount = calculateTotal()
    const amountInWords = numberToWords(Math.round(totalAmount)) + " Rupees Only"

    return (
        <>
            <div className="container mx-auto px-2 py-1 bg-white">
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#232C65]">Shipping Invoice</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="copies" className="text-sm font-medium">
                                Copies:
                            </label>
                            <input
                                id="copies"
                                type="number"
                                min="1"
                                value={copies}
                                onChange={(e) => setCopies(Math.max(1, Number.parseInt(e.target.value) || 1))}
                                className="w-16 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <Button onClick={handlePrint} className="flex items-center gap-2 bg-[#232C65] hover:bg-[#1a2150]">
                            <Printer className="h-4 w-4" />
                            Print Invoice
                        </Button>
                    </div>
                </div>

                <div
                    ref={printableAreaRef}
                    className="printableArea bg-white p-1 border border-gray-200 rounded-lg shadow-sm"
                    style={{ maxWidth: "210mm", margin: "0 auto" }} // A4 width
                >
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold">SHIPPING INVOICE</h1>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 text-[12px]">
                        <div>
                            <p>
                                <strong>Date:</strong> {awbData.date ? format(new Date(awbData.date), "dd/MM/yyyy") : "N/A"}
                            </p>
                            <p>
                                <strong>Pre Carriage By:</strong> {awbData.via || "N/A"}
                            </p>
                            <p>
                                <strong>Vessel/Flight No:</strong> {awbData.forwardingNo || "N/A"}
                            </p>
                            <p>
                                <strong>Port of Discharge:</strong> {awbData.sender?.country || "N/A"}
                            </p>
                            <p>
                                <strong>Country of Origin of Goods:</strong> {awbData.sender?.country || "INDIA"}
                            </p>
                        </div>
                        <div>
                            <p>
                                <strong>EXP. REF-</strong> {awbData.trackingNumber}
                            </p>
                            <p>
                                <strong>Place of Receipt by Pre-carrier:</strong>
                            </p>
                            <p>
                                <strong>Port of Loading:</strong> {awbData.sender?.country || "N/A"}
                            </p>
                            <p>
                                <strong>Final Destination:</strong> {awbData.receiver?.country || "N/A"}
                            </p>
                            <p>
                                <strong>Country of Final Destination:</strong> {awbData.receiver?.country || "N/A"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-6 text-[12px]">
                        <div className="border border-gray-300 p-1 rounded-lg">
                            <h2 className="font-bold mb-2">Sender:</h2>
                            <p className="font-bold uppercase">{awbData.sender?.name}</p>
                            <p>{awbData.sender?.address}</p>
                            <p>
                                {awbData.sender?.zip}, {awbData.sender?.country}
                            </p>
                            <p>
                                <strong>Cont No:</strong> {awbData.sender?.contact}
                            </p>
                            <p>
                                <strong>Email:</strong> {awbData.sender?.email || "yourship.sunexpress@gmail.com"}
                            </p>
                            {awbData.gst && (
                                <p>
                                    <strong>GST No -</strong> {awbData.gst}
                                </p>
                            )}
                        </div>
                        <div className="border border-gray-300 rounded-lg p-1">
                            <h2 className="font-bold mb-2">Receiver:</h2>
                            <p className="font-bold uppercase">{awbData.receiver?.name}</p>
                            <p>{awbData.receiver?.address}</p>
                            <p>
                                {awbData.receiver?.zip}, {awbData.receiver?.country}
                            </p>
                            <p>
                                <strong>Cont No:</strong> {awbData.receiver?.contact}
                            </p>
                            <p>
                                <strong>Email:</strong> {awbData.receiver?.email || "yourship.sunexpress@gmail.com"}
                            </p>
                        </div>
                    </div>

                    <div className="h-[620px]">
                        <table className="w-full border-collapse mb-2 text-[12px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-2 text-left w-[10px] whitespace-nowrap">Sr No.</th>
                                    <th className="border border-gray-300 px-2 text-left">Description of Goods</th>
                                    <th className="border border-gray-300 px-2 text-left w-[80px]">HSN Code</th>
                                    <th className="border border-gray-300 px-2 text-left w-[20px]">Quantity</th>
                                    <th className="border border-gray-300 px-2 text-left w-[40px]">Rate</th>
                                    <th className="border border-gray-300 px-2 text-left w-[40px]">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {awbData.boxes?.flatMap((box, boxIndex) => [
                                    <tr key={`box-header-${boxIndex}`} className="bg-gray-200">
                                        <td colSpan={6} className="border border-gray-300 py-0 font-bold text-center text-[10px]">
                                            Box No {boxIndex + 1}
                                        </td>
                                    </tr>,
                                    ...box.items.map((item, itemIndex) => (
                                        <tr key={`box-${boxIndex}-item-${itemIndex}`}>
                                            <td className="border border-gray-300 px-2 w-[10px]">{itemIndex + 1}</td>
                                            <td className="border border-gray-300 px-2">{item.name}</td>
                                            <td className="border border-gray-300 px-2 w-[80px] text-center">{item.hsnCode || "N/A"}</td>
                                            <td className="border border-gray-300 px-2 w-[20px]">{item.quantity}</td>
                                            <td className="border border-gray-300 px-2 w-[40px] whitespace-nowrap">
                                                ₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="border border-gray-300 px-2 w-[40px] whitespace-nowrap">
                                                ₹
                                                {(Number(item.price) * Number(item.quantity)).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                        </tr>
                                    )),
                                ])}
                                <tr className="font-bold text-[12px]">
                                    <td colSpan={5} className="border border-gray-300 p-0 text-[10px] whitespace-nowrap text-right pr-2">
                                        Total Amount:
                                    </td>
                                    <td className="border border-gray-300 px-2 whitespace-nowrap">
                                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr className="font-bold text-[12px]">
                                    <td className="border border-gray-300 p-0 text-[10px] whitespace-nowrap text-center">In Words:</td>
                                    <td colSpan={5} className="border border-gray-300 px-2">
                                        {amountInWords}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-2 pt-1 text-justify italic text-[12px] border-t border-gray-400">
                        <p>We certify that the information given above is true and correct to the best of our knowledge</p>
                    </div>

                    <div className="mt-2 mr-4 text-right text-[12px]">
                        <p className="mr-12">Signature & Date</p>
                        <div className="h-10"></div>
                        <div className="border-t border-gray-400 w-48 ml-auto"></div>
                    </div>
                </div>
            </div>
        </>
    )
}
