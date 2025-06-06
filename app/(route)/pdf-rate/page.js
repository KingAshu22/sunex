"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer } from "lucide-react"
import { Countries} from "@/app/constants/country"

export default function RateCalculator() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    startWeight: 0.5,
    endWeight: 5,
    country: "",
    selectedServices: [],
    profitPercent: 0,
    includeGST: false,
  })
  const [results, setResults] = useState(null);

  useEffect(() => {
    // Fetch available services on component mount
    fetchServices()
    }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services")
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleCountryChange = (value) => {
    setFormData({
      ...formData,
      country: value,
    })
  }

  const handleServiceToggle = (service) => {
    setFormData((prev) => {
      const selectedServices = prev.selectedServices.includes(service)
        ? prev.selectedServices.filter((s) => s !== service)
        : [...prev.selectedServices, service]

      return {
        ...prev,
        selectedServices,
      }
    })
  }

  const handleGSTToggle = (checked) => {
    setFormData({
      ...formData,
      includeGST: checked,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.country || formData.selectedServices.length === 0) {
      alert("Please select a country and at least one service")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/rate-range", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error calculating rates:", error)
      alert("Error calculating rates. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")

    printWindow.document.write(`
      <html>
        <head>
          <title>Rate Sheet - SunEx Services</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
            }
            .letterhead {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #F44336;
            }
            .tagline {
              font-style: italic;
              margin-bottom: 10px;
            }
            .contact {
              font-size: 14px;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .gst-note {
              margin: 15px 0;
              font-style: italic;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: center;
            }
            th {
              background-color: #f2f2f2;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              text-align: center;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div class="company-name">SunEx Services Pvt Ltd</div>
            <div class="tagline">International & Domestic Courier & Cargo Services</div>
            <div class="contact">Mob No: +91 70213 35122</div>
          </div>
          
          <div class="title">Rate for ${results?.countryName || ""}</div>
          
          <div class="gst-note">
            ${formData.includeGST ? "Rates are inclusive of 18% GST" : "18% GST will be charged extra"}
            <br>
            All rates are per kg
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Weight (kg)</th>
                ${results?.headers.map((header) => `<th>${header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${results?.rows
                .map(
                  (row) => `
                <tr>
                  <td>${row.weight}</td>
                  ${row.rates.map((rate) => `<td>${rate || "-"}</td>`).join("")}
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for choosing SunEx Services Pvt Ltd</p>
            <p>This rate sheet is as of  ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Add a small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Rate Calculator</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generate Rate Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Select Country</Label>
                <Select onValueChange={handleCountryChange} value={formData.country}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profitPercent">Profit Percentage</Label>
                <Input
                  id="profitPercent"
                  name="profitPercent"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.profitPercent}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startWeight">Start Weight (kg)</Label>
                <Input
                  id="startWeight"
                  name="startWeight"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.startWeight}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endWeight">End Weight (kg)</Label>
                <Input
                  id="endWeight"
                  name="endWeight"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.endWeight}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Services</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {services.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service}`}
                      checked={formData.selectedServices.includes(service)}
                      onCheckedChange={() => handleServiceToggle(service)}
                    />
                    <Label htmlFor={`service-${service}`}>{service}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="includeGST" checked={formData.includeGST} onCheckedChange={handleGSTToggle} />
              <Label htmlFor="includeGST">Include 18% GST in rates</Label>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Calculating..." : "Generate Rate Sheet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rate Sheet</CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">SunEx Services Pvt Ltd</h2>
              <p className="text-sm italic">International & Domestic Courier & Cargo Services</p>
              <p className="text-xs mt-1">
                Mob No: +91 70213 35122
              </p>
            </div>

            <h3 className="text-lg font-semibold text-center mb-4">Rate for {results.countryName}</h3>

            <p className="text-sm italic mb-4">
              {formData.includeGST ? "Rates are inclusive of 18% GST" : "18% GST will be charged extra"}
              <br />
              All rates are per kg
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left">Weight (kg)</th>
                    {results.headers.map((header) => (
                      <th key={header} className="border p-2 text-center">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="border p-2 font-medium">{row.weight}</td>
                      {row.rates.map((rate, idx) => (
                        <td key={idx} className="border p-2 text-center">
                          {rate || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
