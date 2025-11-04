"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Trash2, FileText, DollarSign, Package, Printer } from "lucide-react"
import isAdminAuth from "@/lib/isAdminAuth"

function BillingListPage() {
  const [bills, setBills] = useState([])
  const [filteredBills, setFilteredBills] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)

  // Fetch all bills on component mount
  useEffect(() => {
    fetchBills()
  }, [])

  // Update filtered bills when search or filter changes
  useEffect(() => {
    applyFilters()
  }, [bills, searchQuery, filterStatus])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/billing")
      if (response.ok) {
        const data = await response.json()
        setBills(data)
      }
    } catch (error) {
      console.error("Error fetching bills:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...bills]

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.billingInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.billingInfo?.gst?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by status
    if (filterStatus === "paid") {
      result = result.filter((bill) => bill.balance === 0)
    } else if (filterStatus === "pending") {
      result = result.filter((bill) => bill.balance > 0)
    }

    setFilteredBills(result)
  }

  const handleDeleteBill = async (id) => {
    if (!confirm("Are you sure you want to delete this bill?")) return

    try {
      const response = await fetch(`/api/billing/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBills(bills.filter((b) => b._id !== id))
        alert("Bill deleted successfully")
      }
    } catch (error) {
      console.error("Error deleting bill:", error)
      alert("Error deleting bill")
    }
  }

  const handlePrintBill = (bill) => {
    // Open bill details page in print mode
    window.open(`/billing/${bill.financialYear}/${bill.billNumber.split("/")[1]}?print=true`, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Billing Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">View and manage all generated invoices</p>
          </div>
          <Link href="/billing/create">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Bill
            </Button>
          </Link>
        </div>

        {/* Filters Section */}
        <Card className="mb-8 shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search Bills
                </label>
                <Input
                  type="text"
                  placeholder="Search by bill number, client name, or GST..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Bills</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchBills} variant="outline" className="w-full bg-transparent">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Bills</CardTitle>
                <CardDescription className="mt-2">
                  Total: {filteredBills.length} bill{filteredBills.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{bills.length} Bills</Badge>
                <Badge className="bg-green-100 text-green-800">
                  ₹{bills.reduce((sum, b) => sum + b.total, 0).toFixed(2)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>AWB Count</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <TableRow key={bill._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-mono font-semibold">
                          <Badge variant="outline">{bill.billNumber}</Badge>
                        </TableCell>
                        <TableCell>{new Date(bill.createdAt).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="font-medium">{bill.billingInfo?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{bill.awbs?.length || 0} AWBs</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">₹{bill.total.toFixed(2)}</TableCell>
                        <TableCell>
                          {bill.balance === 0 ? (
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending: ₹{bill.balance.toFixed(2)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/billing/${bill.financialYear}/${bill.billNumber.split("/")[1]}`}>
                              <Button size="sm" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost" onClick={() => handlePrintBill(bill)}>
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteBill(bill._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No bills found matching your filters</p>
                        <Link href="/billing/create">
                          <Button size="sm" className="mt-4">
                            Create First Bill
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {filteredBills.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-gray-600 text-sm">Total Bills</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredBills.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-gray-600 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{filteredBills.reduce((sum, b) => sum + b.total, 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-gray-600 text-sm">Total Paid</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{filteredBills.reduce((sum, b) => sum + b.paid, 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-gray-600 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{filteredBills.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default isAdminAuth(BillingListPage)
