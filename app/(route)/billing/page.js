'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    Calendar,
    Search,
    FileText,
    Calculator,
    DollarSign,
    Printer,
    Save,
    Package,
    Info,
    Building2,
    User,
    Globe,
    Loader2
} from "lucide-react";
import isAdminAuth from '@/lib/isAdminAuth';

function BillingPage() {
    const [awbs, setAwbs] = useState([]);
    const [filteredAwbs, setFilteredAwbs] = useState([]);
    const [selectedAwbs, setSelectedAwbs] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTrackingNumber, setSearchTrackingNumber] = useState('');
    const [searchRefCode, setSearchRefCode] = useState('');
    const [searchCountry, setSearchCountry] = useState('');
    const [clientOrFranchiseType, setClientOrFranchiseType] = useState('');
    const [billingInfo, setBillingInfo] = useState({
        name: '',
        address: '',
        gst: '',
        isEditable: true
    });
    const [ratesByCountry, setRatesByCountry] = useState({});
    const [manualRates, setManualRates] = useState([]);
    const [rateSettings, setRateSettings] = useState({
        includeGST: true,
        cgst: 9,
        sgst: 9,
        igst: 18
    });
    const [totals, setTotals] = useState({
        subtotal: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        total: 0,
        paid: 0,
        balance: 0
    });

    // New states for rate source selection
    const [rateSource, setRateSource] = useState('awb'); // 'awb' or 'rates'
    const [availableRates, setAvailableRates] = useState([]);
    const [selectedRateType, setSelectedRateType] = useState(''); // This will store the selected rate's originalName
    const [loadingRates, setLoadingRates] = useState(false);
    const [rateApiErrors, setRateApiErrors] = useState([]);

    // Fetch all AWBs on component mount
    useEffect(() => {
        fetchAWBs();
        fetchAvailableRates();
    }, []);

    // Update filtered AWBs when filters change
    useEffect(() => {
        applyFilters();
    }, [awbs, startDate, endDate, searchTrackingNumber, searchRefCode, searchCountry, rateSource, selectedRateType]);

    // Update selected AWBs and billing info when refCode filter is applied
    useEffect(() => {
        if (searchRefCode && clientOrFranchiseType) {
            fetchClientOrFranchiseDetails(searchRefCode, clientOrFranchiseType);
        }
        setSelectedAwbs([]);
        setSelectAll(false);
    }, [searchRefCode, clientOrFranchiseType]);

    // Calculate totals when selected AWBs or rates change
    useEffect(() => {
        calculateTotals();
    }, [selectedAwbs, manualRates, rateSettings]);

    // Handle select all toggle
    useEffect(() => {
        if (selectAll) {
            setSelectedAwbs(filteredAwbs.map(awb => awb._id));
        } else {
            setSelectedAwbs([]);
        }
    }, [selectAll, filteredAwbs]);

    const fetchAWBs = async () => {
        try {
            const response = await fetch('/api/awb');
            const data = await response.json();
            setAwbs(data);
        } catch (error) {
            console.error('Error fetching AWBs:', error);
        }
    };

    const fetchAvailableRates = async () => {
        try {
            const response = await fetch('/api/rates');
            const data = await response.json();
            setAvailableRates(data);
        } catch (error) {
            console.error('Error fetching rates:', error);
        }
    };

    const fetchRateFromAPI = async (rateType, weight, country) => {
        try {
            const params = new URLSearchParams({
                type: rateType,
                weight: weight.toString(),
                country: country,
                profitPercent: '0'
            });
            
            const response = await fetch(`/api/rate?${params}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch rate for ${country}`);
            }
            
            const data = await response.json();
            return data.rate || 0;
        } catch (error) {
            console.error('Error fetching rate:', error);
            return null;
        }
    };

    const fetchRatesForAWBs = async (awbList) => {
        if (!selectedRateType) {
            setRateApiErrors(['Please select a rate type']);
            return;
        }

        setLoadingRates(true);
        setRateApiErrors([]);
        const errors = [];
        
        const updatedRates = await Promise.all(
            awbList.map(async (awb) => {
                const weight = calculateAWBWeight(awb);
                const country = awb.receiver?.country || 'Unknown';
                
                const rate = await fetchRateFromAPI(selectedRateType, weight, country);
                
                if (rate === null) {
                    errors.push(`Failed to fetch rate for AWB ${awb.trackingNumber} (${country})`);
                    // Fallback to AWB rate
                    return {
                        awbId: awb._id,
                        rate: parseFloat(awb.rateInfo?.rate) || 0,
                        weight: weight,
                        country: country,
                        isFromAPI: false
                    };
                }
                
                return {
                    awbId: awb._id,
                    rate: rate,
                    weight: weight,
                    country: country,
                    isFromAPI: true
                };
            })
        );

        setManualRates(updatedRates);
        setRateApiErrors(errors);
        setLoadingRates(false);
    };

    const fetchClientOrFranchiseDetails = async (code, type) => {
        try {
            let url = '';
            if (type === 'client') {
                url = `/api/clients/${code}`;
            } else if (type === 'franchise') {
                url = `/api/franchises/${code}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data) {
                setBillingInfo({
                    name: data.name || data.companyName || '',
                    address: data.address || '',
                    gst: data.gstNo || '',
                    isEditable: true
                });
            }
        } catch (error) {
            console.error(`Error fetching ${type} details:`, error);
            setBillingInfo({
                name: '',
                address: '',
                gst: '',
                isEditable: true
            });
        }
    };

    const applyFilters = async () => {
        let result = [...awbs];

        // Filter by date range
        if (startDate) {
            const start = new Date(startDate);
            result = result.filter(awb => new Date(awb.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(awb => new Date(awb.date) <= end);
        }

        // Filter by tracking number
        if (searchTrackingNumber) {
            result = result.filter(awb =>
                awb.trackingNumber?.includes(searchTrackingNumber) ||
                awb.cNoteNumber?.includes(searchTrackingNumber)
            );
        }

        // Filter by refCode
        if (searchRefCode) {
            result = result.filter(awb => awb.refCode === searchRefCode);
        }

        // Filter by country
        if (searchCountry) {
            result = result.filter(awb =>
                awb.receiver?.country?.toLowerCase().includes(searchCountry.toLowerCase()) ||
                awb.sender?.country?.toLowerCase().includes(searchCountry.toLowerCase())
            );
        }

        setFilteredAwbs(result);

        // Initialize rates based on rate source
        if (rateSource === 'rates' && selectedRateType) {
            // Fetch rates from API for all filtered AWBs
            await fetchRatesForAWBs(result);
        } else {
            // Use rates from AWB data (default)
            const countryRates = {};
            result.forEach(awb => {
                const country = awb.receiver?.country || 'Unknown';
                const weight = parseFloat(awb.rateInfo?.weight) || calculateAWBWeight(awb);
                const rate = parseFloat(awb.rateInfo?.rate) || 0;

                if (weight > 0) {
                    const ratePerKg = rate / weight;
                    if (!countryRates[country]) {
                        countryRates[country] = [];
                    }
                    countryRates[country].push(ratePerKg);
                }
            });

            // Calculate average rate per kg for each country
            Object.keys(countryRates).forEach(country => {
                const avgRate = countryRates[country].reduce((a, b) => a + b, 0) / countryRates[country].length;
                countryRates[country] = avgRate;
            });

            setRatesByCountry(countryRates);

            // Initialize manual rates
            setManualRates(result.map(awb => ({
                awbId: awb._id,
                rate: parseFloat(awb.rateInfo?.rate) || 0,
                weight: parseFloat(awb.rateInfo?.weight) || calculateAWBWeight(awb),
                country: awb.receiver?.country || 'Unknown',
                isFromAPI: false
            })));
        }
    };

    const calculateAWBWeight = (awb) => {
        const boxes = awb.boxes || [];
        const ourBoxes = awb.ourBoxes || [];
        const vendorBoxes = awb.vendorBoxes || [];
        return [...boxes, ...ourBoxes, ...vendorBoxes].reduce(
            (sum, box) => sum + (parseFloat(box.chargeableWeight) || 0), 
            0
        );
    };

    const handleAWBSelection = (awbId) => {
        setSelectedAwbs(prev =>
            prev.includes(awbId)
                ? prev.filter(id => id !== awbId)
                : [...prev, awbId]
        );
    };

    const handleSelectAll = () => {
        setSelectAll(!selectAll);
    };

    const handleBillingInfoChange = (field, value) => {
        setBillingInfo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRateChange = (awbId, field, value) => {
        setManualRates(prev =>
            prev.map(rate =>
                rate.awbId === awbId
                    ? { ...rate, [field]: parseFloat(value) || 0, isFromAPI: false }
                    : rate
            )
        );
    };

    const handleCountryRateChange = (country, ratePerKg) => {
        const newRatePerKg = parseFloat(ratePerKg) || 0;

        setManualRates(prev =>
            prev.map(rate =>
                rate.country === country
                    ? {
                        ...rate,
                        rate: newRatePerKg * rate.weight,
                        isFromAPI: false
                    }
                    : rate
            )
        );
    };

    const calculateTotals = () => {
        if (selectedAwbs.length === 0) {
            setTotals({
                subtotal: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                total: 0,
                paid: 0,
                balance: 0
            });
            return;
        }

        const selectedRates = manualRates.filter(rate => selectedAwbs.includes(rate.awbId));
        const subtotal = selectedRates.reduce((sum, rate) => sum + rate.rate, 0);

        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        if (rateSettings.includeGST) {
            const taxRate = rateSettings.igst > 0 ? rateSettings.igst : (rateSettings.cgst + rateSettings.sgst);
            const taxableValue = subtotal / (1 + taxRate / 100);
            const taxAmount = subtotal - taxableValue;

            if (rateSettings.igst > 0) {
                igstAmount = taxAmount;
            } else {
                cgstAmount = taxAmount / 2;
                sgstAmount = taxAmount / 2;
            }
        } else {
            if (rateSettings.igst > 0) {
                igstAmount = (subtotal * rateSettings.igst) / 100;
            } else {
                cgstAmount = (subtotal * rateSettings.cgst) / 100;
                sgstAmount = (subtotal * rateSettings.sgst) / 100;
            }
        }

        const total = rateSettings.includeGST ? subtotal : subtotal + cgstAmount + sgstAmount + igstAmount;
        const balance = total - totals.paid;

        setTotals({
            subtotal,
            cgstAmount,
            sgstAmount,
            igstAmount,
            total,
            paid: totals.paid,
            balance
        });
    };

    const handlePaidAmountChange = (value) => {
        const paid = parseFloat(value) || 0;
        const balance = totals.total - paid;

        setTotals(prev => ({
            ...prev,
            paid,
            balance
        }));
    };

    const handleRateSourceChange = async (value) => {
        setRateSource(value);
        if (value === 'rates' && selectedRateType && filteredAwbs.length > 0) {
            await fetchRatesForAWBs(filteredAwbs);
        } else if (value === 'awb') {
            // Reset to AWB rates
            applyFilters();
        }
    };

    const handleRateTypeChange = async (value) => {
        setSelectedRateType(value);
        if (rateSource === 'rates' && value && filteredAwbs.length > 0) {
            await fetchRatesForAWBs(filteredAwbs);
        }
    };

    const saveBilling = async () => {
        try {
            const billingData = {
                billingInfo,
                rateSource,
                selectedRateType: rateSource === 'rates' ? selectedRateType : null,
                awbs: selectedAwbs.map(id => {
                    const awb = awbs.find(a => a._id === id);
                    const rate = manualRates.find(r => r.awbId === id);
                    const ratePerKg = rate?.weight ? rate.rate / rate.weight : 0;

                    return {
                        awbId: id,
                        trackingNumber: awb.trackingNumber,
                        weight: rate?.weight || 0,
                        ratePerKg: parseFloat(ratePerKg.toFixed(2)),
                        amount: rate?.rate || 0,
                        country: awb.receiver?.country || "Unknown",
                        isFromAPI: rate?.isFromAPI || false
                    };
                }),
                subtotal: totals.subtotal,
                cgst: rateSettings.cgst,
                sgst: rateSettings.sgst,
                igst: rateSettings.igst,
                cgstAmount: totals.cgstAmount,
                sgstAmount: totals.sgstAmount,
                igstAmount: totals.igstAmount,
                total: totals.total,
                paid: totals.paid,
                balance: totals.balance,
            };

            const res = await fetch("/api/billing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(billingData),
            });

            if (!res.ok) throw new Error("Failed to save bill");
            const result = await res.json();

            alert(`Bill Saved! Bill No: ${result.bill.billNumber}`);
        } catch (err) {
            console.error(err);
            alert("Error saving bill");
        }
    };

    const printBill = () => {
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
      <html>
        <head>
          <title>GST Invoice</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
            .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .invoice-header h1 { margin: 0; color: #333; font-size: 28px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .billing-info { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
            .billing-info h3 { margin-top: 0; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: 600; }
            .totals { margin-top: 20px; }
            .total-row { font-weight: bold; font-size: 18px; }
            .signature { margin-top: 60px; text-align: right; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>GST TAX INVOICE</h1>
            <p style="color: #666;">Invoice Date: ${new Date().toLocaleDateString('en-IN')}</p>
            ${rateSource === 'rates' ? `<p style="color: #666;">Rate Type: ${selectedRateType}</p>` : ''}
          </div>
          
          <div class="billing-info">
            <h3>BILL TO:</h3>
            <p><strong>Name:</strong> ${billingInfo.name}</p>
            <p><strong>Address:</strong> ${billingInfo.address}</p>
            <p><strong>GST Number:</strong> ${billingInfo.gst}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>AWB No.</th>
                <th>Tracking No.</th>
                <th>Weight (kg)</th>
                <th>Rate/kg</th>
                <th>Country</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedAwbs.map((id, index) => {
                const awb = awbs.find(a => a._id === id);
                const rate = manualRates.find(r => r.awbId === id);
                const ratePerKg = rate?.weight ? rate.rate / rate.weight : 0;
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${awb?.cNoteNumber || awb?.awbNumber || '-'}</td>
                    <td>${awb?.trackingNumber}</td>
                    <td>${rate?.weight?.toFixed(2) || 0}</td>
                    <td>₹${ratePerKg.toFixed(2)}</td>
                    <td>${awb?.receiver?.country || 'Unknown'}</td>
                    <td>₹${(rate?.rate || 0).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <table style="width: 50%; margin-left: auto;">
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td style="text-align: right;">₹${totals.subtotal.toFixed(2)}</td>
              </tr>
              ${totals.cgstAmount > 0 ? `<tr><td><strong>CGST (${rateSettings.cgst}%):</strong></td><td style="text-align: right;">₹${totals.cgstAmount.toFixed(2)}</td></tr>` : ''}
              ${totals.sgstAmount > 0 ? `<tr><td><strong>SGST (${rateSettings.sgst}%):</strong></td><td style="text-align: right;">₹${totals.sgstAmount.toFixed(2)}</td></tr>` : ''}
              ${totals.igstAmount > 0 ? `<tr><td><strong>IGST (${rateSettings.igst}%):</strong></td><td style="text-align: right;">₹${totals.igstAmount.toFixed(2)}</td></tr>` : ''}
              <tr class="total-row">
                <td><strong>TOTAL:</strong></td>
                <td style="text-align: right;">₹${totals.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Paid Amount:</strong></td>
                <td style="text-align: right;">₹${totals.paid.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Balance Due:</strong></td>
                <td style="text-align: right;">₹${totals.balance.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div class="signature">
            <p>_______________________</p>
            <p>Authorized Signatory</p>
          </div>
          
          <div class="footer">
            <p>This is a computer generated invoice</p>
          </div>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Billing Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Create and manage GST invoices for your shipments
                    </p>
                </div>

                {/* Filters Section */}
                <Card className="mb-8 shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Filter AWBs
                        </CardTitle>
                        <CardDescription>
                            Search and filter AWBs to include in the billing
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Start Date
                                </Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    End Date
                                </Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Tracking Number
                                </Label>
                                <Input
                                    type="text"
                                    value={searchTrackingNumber}
                                    onChange={(e) => setSearchTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Client/Franchise Code
                                </Label>
                                <Input
                                    type="text"
                                    value={searchRefCode}
                                    onChange={(e) => setSearchRefCode(e.target.value)}
                                    placeholder="Enter ref code"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Client/Franchise Type
                                </Label>
                                <select
                                    value={clientOrFranchiseType}
                                    onChange={(e) => setClientOrFranchiseType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Type</option>
                                    <option value="client">Client</option>
                                    <option value="franchise">Franchise</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Country
                                </Label>
                                <Input
                                    type="text"
                                    value={searchCountry}
                                    onChange={(e) => setSearchCountry(e.target.value)}
                                    placeholder="Enter country name"
                                />
                            </div>
                        </div>

                        {/* Rate Source Selection */}
                        <Separator className="my-6" />
                        
                        <div className="space-y-4">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Calculator className="w-5 h-5" />
                                Rate Calculation Source
                            </Label>
                            <RadioGroup value={rateSource} onValueChange={handleRateSourceChange}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <RadioGroupItem value="awb" id="awb" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="awb" className="cursor-pointer font-medium">
                                                Rate from AWB Data
                                            </Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Use the default rates stored in AWB records
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <RadioGroupItem value="rates" id="rates" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="rates" className="cursor-pointer font-medium">
                                                Rate from Rates Data
                                            </Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Use rates from the rate master API
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </RadioGroup>
                            
                            {rateSource === 'rates' && (
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
                                                {rate.originalName} ({rate.type} - {rate.service})
                                            </option>
                                        ))}
                                    </select>
                                    
                                    {selectedRateType && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge variant="secondary" className="text-sm">
                                                Selected: {selectedRateType}
                                            </Badge>
                                            {loadingRates && (
                                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Fetching rates...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {rateApiErrors.length > 0 && (
                                <Alert className="bg-yellow-50 border-yellow-200">
                                    <Info className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription>
                                        <div className="text-yellow-800">
                                            <p className="font-semibold mb-2">Some rates couldn't be fetched:</p>
                                            <ul className="list-disc list-inside text-sm">
                                                {rateApiErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* AWB Selection Section */}
                <Card className="mb-8 shadow-xl border-0">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Select AWBs for Billing</CardTitle>
                                <CardDescription className="mt-2">
                                    {selectedAwbs.length} of {filteredAwbs.length} AWBs selected
                                </CardDescription>
                            </div>
                            <Button
                                onClick={handleSelectAll}
                                variant={selectAll ? "destructive" : "default"}
                                size="sm"
                            >
                                {selectAll ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Tracking No.</TableHead>
                                        <TableHead>Sender</TableHead>
                                        <TableHead>Receiver</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Weight (kg)</TableHead>
                                        {rateSource === 'rates' && <TableHead>Rate Source</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAwbs.map((awb) => {
                                        const weight = calculateAWBWeight(awb);
                                        const rate = manualRates.find(r => r.awbId === awb._id);
                                        return (
                                            <TableRow key={awb._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAwbs.includes(awb._id)}
                                                        onChange={() => handleAWBSelection(awb._id)}
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {new Date(awb.date).toLocaleDateString("en-IN")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{awb.trackingNumber}</Badge>
                                                </TableCell>
                                                <TableCell className="truncate max-w-[150px]">
                                                    {awb.sender?.name || 'Unknown'}
                                                </TableCell>
                                                <TableCell className="truncate max-w-[150px]">
                                                    {awb.receiver?.name || 'Unknown'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge>{awb.refCode || 'N/A'}</Badge>
                                                </TableCell>
                                                <TableCell>{awb.receiver?.country || 'Unknown'}</TableCell>
                                                <TableCell className="font-semibold">
                                                    {weight.toFixed(2)}
                                                </TableCell>
                                                {rateSource === 'rates' && (
                                                    <TableCell>
                                                        {rate?.isFromAPI ? (
                                                            <Badge variant="secondary" className="bg-green-100">API</Badge>
                                                        ) : (
                                                            <Badge variant="outline">AWB</Badge>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            
                            {filteredAwbs.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No AWBs found matching the filters</p>
                                </div>
                            )}
                            
                            {filteredAwbs.length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Total Weight:</span>
                                        <Badge variant="secondary" className="text-lg">
                                            {filteredAwbs.reduce((total, awb) => total + calculateAWBWeight(awb), 0).toFixed(2)} kg
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Billing Information Section */}
                {selectedAwbs.length > 0 && (
                    <Card className="mb-8 shadow-xl border-0">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
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
                                        onChange={(e) => handleBillingInfoChange('name', e.target.value)}
                                        disabled={!billingInfo.isEditable}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>GST Number</Label>
                                    <Input
                                        type="text"
                                        value={billingInfo.gst}
                                        onChange={(e) => handleBillingInfoChange('gst', e.target.value)}
                                        disabled={!billingInfo.isEditable}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <Label>Billing Address</Label>
                                    <textarea
                                        value={billingInfo.address}
                                        onChange={(e) => handleBillingInfoChange('address', e.target.value)}
                                        rows="3"
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={!billingInfo.isEditable}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <Button
                                        onClick={() => setBillingInfo(prev => ({ ...prev, isEditable: !prev.isEditable }))}
                                        variant="outline"
                                    >
                                        {billingInfo.isEditable ? 'Lock Details' : 'Edit Details'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Rate Configuration Section */}
                {selectedAwbs.length > 0 && (
                    <Card className="mb-8 shadow-xl border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5" />
                                Rate Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* GST Inclusion */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">GST Settings</Label>
                                <RadioGroup 
                                    value={rateSettings.includeGST ? "yes" : "no"}
                                    onValueChange={(value) => setRateSettings(prev => ({ ...prev, includeGST: value === "yes" }))}
                                >
                                    <div className="flex space-x-6">
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
                            </div>

                            <Separator />

                            {/* Tax Rates */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Tax Rates</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>CGST (%)</Label>
                                        <Input
                                            type="number"
                                            value={rateSettings.cgst}
                                            onChange={(e) =>
                                                setRateSettings((prev) => ({
                                                    ...prev,
                                                    cgst: parseFloat(e.target.value) || 0,
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
                                                    sgst: parseFloat(e.target.value) || 0,
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
                                                    igst: parseFloat(e.target.value) || 0,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Individual AWB Rates Table */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Individual AWB Rates</Label>
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 dark:bg-gray-800">
                                                <TableHead>AWB No.</TableHead>
                                                <TableHead>Tracking No.</TableHead>
                                                <TableHead>Weight (kg)</TableHead>
                                                <TableHead>Country</TableHead>
                                                <TableHead>Rate/kg (₹)</TableHead>
                                                <TableHead>Amount (₹)</TableHead>
                                                {rateSource === 'rates' && <TableHead>Source</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {manualRates
                                                .filter((rate) => selectedAwbs.includes(rate.awbId))
                                                .map((rate) => {
                                                    const awb = awbs.find((a) => a._id === rate.awbId);
                                                    const ratePerKg = rate.weight > 0 ? rate.rate / rate.weight : 0;

                                                    return (
                                                        <TableRow key={rate.awbId}>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {awb?.cNoteNumber || awb?.awbNumber || "-"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{awb?.trackingNumber}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={rate.weight}
                                                                    onChange={(e) =>
                                                                        handleRateChange(rate.awbId, "weight", e.target.value)
                                                                    }
                                                                    className="w-24"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge>{rate.country}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={ratePerKg.toFixed(2)}
                                                                    onChange={(e) => {
                                                                        const newRatePerKg = parseFloat(e.target.value) || 0;
                                                                        handleRateChange(
                                                                            rate.awbId,
                                                                            "rate",
                                                                            newRatePerKg * rate.weight
                                                                        );
                                                                    }}
                                                                    className="w-28"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={rate.rate}
                                                                    onChange={(e) =>
                                                                        handleRateChange(rate.awbId, "rate", e.target.value)
                                                                    }
                                                                    className="w-32"
                                                                />
                                                            </TableCell>
                                                            {rateSource === 'rates' && (
                                                                <TableCell>
                                                                    {rate.isFromAPI ? (
                                                                        <Badge className="bg-green-100 text-green-800">API</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline">Manual</Badge>
                                                                    )}
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Billing Summary Section */}
                {selectedAwbs.length > 0 && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Billing Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-semibold text-lg">₹{totals.subtotal.toFixed(2)}</span>
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
                                    <span className="font-bold text-xl">Total</span>
                                    <span className="font-bold text-2xl text-blue-600">₹{totals.total.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center py-3">
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
                                    <span className={`font-bold text-xl ${totals.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                                        ₹{totals.balance.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-end gap-4 bg-gray-50 dark:bg-gray-800">
                            <Button variant="outline" onClick={printBill} size="lg">
                                <Printer className="w-4 h-4 mr-2" />
                                Print GST Bill
                            </Button>
                            <Button onClick={saveBilling} size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                                <Save className="w-4 h-4 mr-2" />
                                Save Billing
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default isAdminAuth(BillingPage);