// app/billing/page.jsx

'use client';

import { useState, useEffect } from 'react';

export default function BillingPage() {
    const [awbs, setAwbs] = useState([]);
    const [filteredAwbs, setFilteredAwbs] = useState([]);
    const [selectedAwbs, setSelectedAwbs] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTrackingNumber, setSearchTrackingNumber] = useState('');
    const [searchRefCode, setSearchRefCode] = useState('');
    const [searchCountry, setSearchCountry] = useState('');
    const [clientOrFranchiseType, setClientOrFranchiseType] = useState(''); // 'client', 'franchise', or ''
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

    // Fetch all AWBs on component mount
    useEffect(() => {
        fetchAWBs();
    }, []);

    // Update filtered AWBs when filters change
    useEffect(() => {
        applyFilters();
    }, [awbs, startDate, endDate, searchTrackingNumber, searchRefCode, searchCountry]);

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
            // Reset billing info if not found
            setBillingInfo({
                name: '',
                address: '',
                gst: '',
                isEditable: true
            });
        }
    };

    const applyFilters = () => {
        let result = [...awbs];

        // Filter by date range
        if (startDate) {
            const start = new Date(startDate);
            result = result.filter(awb => new Date(awb.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include entire end day
            result = result.filter(awb => new Date(awb.date) <= end);
        }

        // Filter by tracking number
        if (searchTrackingNumber) {
            result = result.filter(awb =>
                awb.trackingNumber?.includes(searchTrackingNumber) ||
                awb.cNoteNumber?.includes(searchTrackingNumber)
            );
        }

        // Filter by refCode (client/franchise code)
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

        // Initialize rates by country
        const countryRates = {};
        result.forEach(awb => {
            const country = awb.receiver?.country || 'Unknown';
            const weight = parseFloat(awb.rateInfo?.weight) || 0;
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

        // Initialize manual rates for selected AWBs
        setManualRates(result.map(awb => ({
            awbId: awb._id,
            rate: parseFloat(awb.rateInfo?.rate) || 0,
            weight: parseFloat(awb.rateInfo?.weight) || 0,
            country: awb.receiver?.country || 'Unknown'
        })));
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
                    ? { ...rate, [field]: parseFloat(value) || 0 }
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
                        rate: newRatePerKg * rate.weight
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
            // If rates include GST, we need to extract it
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
            // If rates exclude GST, we need to add it
            if (rateSettings.igst > 0) {
                igstAmount = (subtotal * rateSettings.igst) / 100;
            } else {
                cgstAmount = (subtotal * rateSettings.cgst) / 100;
                sgstAmount = (subtotal * rateSettings.sgst) / 100;
            }
        }

        const total = subtotal + cgstAmount + sgstAmount + igstAmount;
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

    const saveBilling = () => {
        // Here you would typically send the billing data to your backend
        // For now, we'll just log it and prepare for printing
        const billingData = {
            billingInfo,
            selectedAwbs: selectedAwbs.map(id => {
                const awb = awbs.find(a => a._id.$oid === id);
                const rate = manualRates.find(r => r.awbId === id);
                return {
                    ...awb,
                    appliedRate: rate?.rate || 0
                };
            }),
            rates: manualRates.filter(r => selectedAwbs.includes(r.awbId)),
            totals,
            rateSettings
        };

        console.log('Billing Data Saved:', billingData);
        alert('Billing information saved successfully!');
    };

    const printBill = () => {
        // Create a print-friendly version
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
      <html>
        <head>
          <title>GST Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-header h1 { margin: 0; color: #333; }
            .billing-info { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; }
            .billing-info h3 { margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; }
            .total-row { font-weight: bold; }
            .signature { margin-top: 50px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>GST TAX INVOICE</h1>
            <p>Invoice Date: ${new Date().toLocaleDateString()}</p>
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
                <th>AWB No.</th>
                <th>Tracking No.</th>
                <th>Weight (kg)</th>
                <th>Rate</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              ${selectedAwbs.map(id => {
            const awb = awbs.find(a => a._id.$oid === id);
            const rate = manualRates.find(r => r.awbId === id);
            return `
                  <tr>
                    <td>${awb.cNoteNumber || awb.awbNumber || '-'}</td>
                    <td>${awb.trackingNumber}</td>
                    <td>${rate?.weight || 0}</td>
                    <td>₹${(rate?.rate || 0).toFixed(2)}</td>
                    <td>${awb.receiver?.country || 'Unknown'}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td>₹${totals.subtotal.toFixed(2)}</td>
              </tr>
              ${totals.cgstAmount > 0 ? `<tr><td><strong>CGST (${rateSettings.cgst}%):</strong></td><td>₹${totals.cgstAmount.toFixed(2)}</td></tr>` : ''}
              ${totals.sgstAmount > 0 ? `<tr><td><strong>SGST (${rateSettings.sgst}%):</strong></td><td>₹${totals.sgstAmount.toFixed(2)}</td></tr>` : ''}
              ${totals.igstAmount > 0 ? `<tr><td><strong>IGST (${rateSettings.igst}%):</strong></td><td>₹${totals.igstAmount.toFixed(2)}</td></tr>` : ''}
              <tr class="total-row">
                <td><strong>TOTAL:</strong></td>
                <td>₹${totals.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Paid Amount:</strong></td>
                <td>₹${totals.paid.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Balance Due:</strong></td>
                <td>₹${totals.balance.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div class="signature">
            <p>Authorized Signatory</p>
          </div>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Billing Section</h1>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Filter AWBs</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                        <input
                            type="text"
                            value={searchTrackingNumber}
                            onChange={(e) => setSearchTrackingNumber(e.target.value)}
                            placeholder="Enter tracking number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client/Franchise Code</label>
                        <input
                            type="text"
                            value={searchRefCode}
                            onChange={(e) => setSearchRefCode(e.target.value)}
                            placeholder="Enter ref code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client/Franchise Type</label>
                        <select
                            value={clientOrFranchiseType}
                            onChange={(e) => setClientOrFranchiseType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Type</option>
                            <option value="client">Client</option>
                            <option value="franchise">Franchise</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                            type="text"
                            value={searchCountry}
                            onChange={(e) => setSearchCountry(e.target.value)}
                            placeholder="Enter country name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* AWB Selection Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Select AWBs for Billing ({selectedAwbs.length} selected)</h2>
                    <button
                        onClick={handleSelectAll}
                        className={`px-4 py-2 rounded-md text-white ${selectAll ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                    >
                        {selectAll ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                </th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking No.</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight(kg)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAwbs.map((awb) => (
                                <tr key={awb._id}>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedAwbs.includes(awb._id)}
                                            onChange={() => handleAWBSelection(awb._id)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">{new Date(awb.date).toLocaleDateString("en-IN")}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">{awb.trackingNumber}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">{awb.sender?.name.slice(0, 20) || 'Unknown'}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">{awb.receiver?.name.slice(0, 20) || 'Unknown'}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">{awb.refCode || 'Unknown'}</td>
                                    <td className="px-2 py-1 whitespace-nowrap">{awb.receiver?.country.slice(0, 20) || 'Unknown'}</td>
                                    {/* for weight calculation in awb their is boxes, ourBoxes and vendorBoxes which is an array of object in each object there is chargeableWeight add all chargeableWeight and sum of all of this weight and from every boxes which ever is greater should be shown as weight here */}
                                    <td className="px-2 py-1 whitespace-nowrap">
                                        {(() => {
                                            const boxes = awb.boxes || [];
                                            const ourBoxes = awb.ourBoxes || [];
                                            const vendorBoxes = awb.vendorBoxes || [];
                                            const totalWeight = [...boxes, ...ourBoxes, ...vendorBoxes].reduce((sum, box) => sum + (parseFloat(box.chargeableWeight) || 0), 0);
                                            return totalWeight.toFixed(2);
                                        })()}
                                    </td>
                                </tr>
                            ))}
                            {/* add a row below showing total weight of all filtered awbs, in awb their is boxes, ourBoxes and vendorBoxes which is an array of object in each object there is chargeableWeight add all chargeableWeight and sum of all of this weight and from every boxes which ever is greater should be shown as weight here */}
                            <tr className="font-bold bg-gray-100">
                                <td className="px-2 py-1 whitespace-nowrap" colSpan={7}>Total Weight (kg)</td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                    {filteredAwbs.reduce((total, awb) => {
                                        const boxes = awb.boxes || [];
                                        const ourBoxes = awb.ourBoxes || [];
                                        const vendorBoxes = awb.vendorBoxes || [];
                                        const awbWeight = [...boxes, ...ourBoxes, ...vendorBoxes].reduce((sum, box) => sum + (parseFloat(box.chargeableWeight) || 0), 0);
                                        return total + awbWeight;
                                    }, 0).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {filteredAwbs.length === 0 && (
                        <div className="text-center py-4 text-gray-500">No AWBs found matching the filters.</div>
                    )}
                </div>
            </div>

            {/* Billing Information Section */}
            {selectedAwbs.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4">Billing Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Name</label>
                            <input
                                type="text"
                                value={billingInfo.name}
                                onChange={(e) => handleBillingInfoChange('name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!billingInfo.isEditable}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                            <input
                                type="text"
                                value={billingInfo.gst}
                                onChange={(e) => handleBillingInfoChange('gst', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!billingInfo.isEditable}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                            <textarea
                                value={billingInfo.address}
                                onChange={(e) => handleBillingInfoChange('address', e.target.value)}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!billingInfo.isEditable}
                            ></textarea>
                        </div>

                        <div className="md:col-span-2">
                            <button
                                onClick={() => setBillingInfo(prev => ({ ...prev, isEditable: !prev.isEditable }))}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                            >
                                {billingInfo.isEditable ? 'Lock Details' : 'Edit Details'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rate Configuration Section */}
            {selectedAwbs.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4">Rate Configuration</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Are rates including GST?
                        </label>
                        <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    checked={rateSettings.includeGST}
                                    onChange={() => setRateSettings(prev => ({ ...prev, includeGST: true }))}
                                    className="form-radio h-5 w-5 text-blue-600"
                                />
                                <span className="ml-2">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    checked={!rateSettings.includeGST}
                                    onChange={() => setRateSettings(prev => ({ ...prev, includeGST: false }))}
                                    className="form-radio h-5 w-5 text-blue-600"
                                />
                                <span className="ml-2">No</span>
                            </label>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">Tax Rates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CGST (%)</label>
                                <input
                                    type="number"
                                    value={rateSettings.cgst}
                                    onChange={(e) => setRateSettings(prev => ({ ...prev, cgst: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SGST (%)</label>
                                <input
                                    type="number"
                                    value={rateSettings.sgst}
                                    onChange={(e) => setRateSettings(prev => ({ ...prev, sgst: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IGST (%)</label>
                                <input
                                    type="number"
                                    value={rateSettings.igst}
                                    onChange={(e) => setRateSettings(prev => ({ ...prev, igst: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">Set Rates by Country</h3>
                        <div className="space-y-3">
                            {Object.keys(ratesByCountry).map(country => (
                                <div key={country} className="flex items-center space-x-4 p-3 bg-gray-50 rounded">
                                    <span className="font-medium w-32">{country}</span>
                                    <span className="text-sm text-gray-600 w-40">
                                        Avg: ₹{ratesByCountry[country].toFixed(2)}/kg
                                    </span>
                                    <input
                                        type="number"
                                        placeholder="Rate per kg"
                                        onChange={(e) => handleCountryRateChange(country, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-3">Individual AWB Rates</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AWB No.</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking No.</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {manualRates
                                        .filter(rate => selectedAwbs.includes(rate.awbId))
                                        .map(rate => {
                                            const awb = awbs.find(a => a._id.$oid === rate.awbId);
                                            return (
                                                <tr key={rate.awbId}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{awb?.cNoteNumber || awb?.awbNumber || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{awb?.trackingNumber}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={rate.weight}
                                                            onChange={(e) => handleRateChange(rate.awbId, 'weight', e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{rate.country}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={rate.rate}
                                                            onChange={(e) => handleRateChange(rate.awbId, 'rate', e.target.value)}
                                                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Totals and Payment Section */}
            {selectedAwbs.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4">Billing Summary</h2>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                            <span className="font-medium">Subtotal:</span>
                            <span>₹{totals.subtotal.toFixed(2)}</span>
                        </div>

                        {totals.cgstAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="font-medium">CGST ({rateSettings.cgst}%):</span>
                                <span>₹{totals.cgstAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {totals.sgstAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="font-medium">SGST ({rateSettings.sgst}%):</span>
                                <span>₹{totals.sgstAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {totals.igstAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="font-medium">IGST ({rateSettings.igst}%):</span>
                                <span>₹{totals.igstAmount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t pt-3 font-bold">
                            <span>Total:</span>
                            <span>₹{totals.total.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-medium">Paid Amount:</span>
                            <input
                                type="number"
                                step="0.01"
                                value={totals.paid}
                                onChange={(e) => handlePaidAmountChange(e.target.value)}
                                className="w-32 px-3 py-1 border border-gray-300 rounded text-right"
                            />
                        </div>

                        <div className="flex justify-between font-bold text-lg">
                            <span>Balance Due:</span>
                            <span className={totals.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                ₹{totals.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={saveBilling}
                            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            Save Billing
                        </button>

                        <button
                            onClick={printBill}
                            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            Print GST Bill
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}