"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import Link from "next/link"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

export default function SinglePickupPage() {
  const { pickupNo } = useParams()
  const router = useRouter()
  const [pickup, setPickup] = useState(null)
  const [loading, setLoading] = useState(true)
  const pdfRef = useRef()

  useEffect(() => {
    async function fetchPickup() {
      try {
        const res = await axios.get(`/api/pickup/${pickupNo}`)
        setPickup(res.data)
      } catch (error) {
        console.error("Error fetching pickup:", error)
        alert("Failed to load pickup data")
      } finally {
        setLoading(false)
      }
    }

    if (pickupNo) {
      fetchPickup()
    }
  }, [pickupNo])

  async function handleDelete() {
    if (confirm("Are you sure you want to delete this pickup? This action cannot be undone.")) {
      try {
        await axios.delete(`/api/pickup/${pickupNo}`)
        router.push("/pickup")
      } catch (error) {
        console.error("Error deleting pickup:", error)
        alert("Failed to delete pickup")
      }
    }
  }

  const handleDownloadPDF = () => {
    const input = pdfRef.current

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Pickup-${pickup.pickupNo}.pdf`)
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading pickup details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!pickup) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="text-red-500">Pickup not found</div>
            <Link
              href="/pickup"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Back to Pickups
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div ref={pdfRef} className="bg-white rounded-lg shadow-md p-6">
        {/* Company Header */}
        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-blue-900">SunEx Services Private Limited</h1>
          <p className="text-lg text-gray-700">International Courier & Cargo Services</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Pickup Details</h2>
            <p className="text-gray-600">Pickup #{pickup.pickupNo}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Save as PDF
            </button>
            <Link
              href={`/edit-pickup/${pickup.pickupNo}`}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Delete
            </button>
            <Link
              href="/pickup"
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Pickup Number:</span>
                <span className="ml-2 text-gray-900">{pickup.pickupNo}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(pickup.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Pickup From:</span>
                <span className="ml-2 text-gray-900">{pickup.pickupFrom}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Client & Location</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Client:</span>
                <span className="ml-2 text-gray-900">{pickup.pickupClient}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <span className="ml-2 text-gray-900">{pickup.pickupLocation}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Boxes:</span>
                <span className="ml-2 text-gray-900">{pickup.pickupBoxes?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Boxes Section - Tabular Format */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Pickup Boxes</h3>

          {!pickup.pickupBoxes || pickup.pickupBoxes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No boxes recorded for this pickup.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-blue-100 border-b">
                    <th className="py-3 px-4 text-left font-semibold text-gray-800">Box #</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-800">Item Name</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-800">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {pickup.pickupBoxes.map((box, boxIndex) => {
                    let boxNumber, items

                    if (typeof box === "string") {
                      boxNumber = boxIndex + 1
                      items = [{ itemName: box, quantity: 1 }]
                    } else if (box && typeof box === "object") {
                      boxNumber = box.boxNumber || boxIndex + 1
                      items = box.items || []
                    } else {
                      boxNumber = boxIndex + 1
                      items = []
                    }

                    if (items.length === 0) {
                      return (
                        <tr key={boxIndex} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-700">Box {boxNumber}</td>
                          <td className="py-3 px-4 text-gray-500 italic">No items listed</td>
                          <td className="py-3 px-4 text-gray-500">—</td>
                        </tr>
                      )
                    }

                    return items.map((item, itemIndex) => {
                      const itemName = item.itemName || item
                      const quantity = item.quantity || 1

                      // Only show box number on first row of each box
                      const displayBoxNumber = itemIndex === 0 ? `Box ${boxNumber}` : ""

                      return (
                        <tr key={`${boxIndex}-${itemIndex}`} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-700">{displayBoxNumber}</td>
                          <td className="py-3 px-4 text-gray-700">• {itemName}</td>
                          <td className="py-3 px-4 text-blue-600 font-medium">Qty: {quantity}</td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="border-t pt-6 mt-8">
          <div className="text-sm text-gray-500">
            <p>Created: {new Date(pickup.createdAt || pickup._id).toLocaleString()}</p>
            {pickup.updatedAt && <p>Last Updated: {new Date(pickup.updatedAt).toLocaleString()}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}