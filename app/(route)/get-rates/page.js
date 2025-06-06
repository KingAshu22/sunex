'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Countries } from '@/app/constants/country';
import axios from 'axios';

const availableTypes = ['dhl', 'fedex', 'ups', 'dtdc', 'aramex', 'orbit'];

export default function GetRatesPage() {
  const [weight, setWeight] = useState('');
  const [country, setCountry] = useState('');
  const [showProfit, setShowProfit] = useState(true);
  const [profitPercent, setProfitPercent] = useState('0');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    userType !== "admin" && setShowProfit(false);
  }, []);

  useEffect(() => {
    const fetchFranchiseProfit = async () => {
      const userType = localStorage.getItem("userType");
      const code = localStorage.getItem("code");

      if (userType !== "admin" && country) {
        try {
          setLoading(true);
          const response = await axios.get(`/api/franchises/${code}`);
          const franchise = response.data[0];
          const rates = franchise.rates || [];

          const matchedRate = rates.find(rate => rate.country === country);
          const defaultRate = rates.find(rate => rate.country === "Rest of World");

          const percent = matchedRate ? matchedRate.percent : (defaultRate ? defaultRate.percent : 0);
          setShowProfit(false);
          setProfitPercent(percent.toString());
        } catch (err) {
          console.error(err);
          setError("Failed to fetch franchise data.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFranchiseProfit();
  }, [country]);

  const handleFetchRates = async () => {
    if (!weight || !country) {
      setError("Please provide weight and country.");
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const promises = availableTypes.map(async (type) => {
        const params = new URLSearchParams({
          type,
          weight,
          country,
          profitPercent,
        });

        const res = await fetch(`/api/rate?${params.toString()}`);
        const data = await res.json();
        return { type, data };
      });

      const resultsData = await Promise.all(promises);
      const filtered = resultsData.filter(r => !r.data.error);
      const firstError = resultsData.find(r => r.data.error);

      if (!filtered.length && firstError) {
        setError(firstError.data.error);
      }

      setResults(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch rates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Check Shipping Rates</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            placeholder="Eg: 2.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <Label>Destination Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select Destination Country" />
            </SelectTrigger>
            <SelectContent>
              {Countries.map((c, i) => (
                <SelectItem key={i} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showProfit && (
          <div>
            <Label>Profit %</Label>
            <Input
              type="number"
              placeholder="Default: 50"
              value={profitPercent}
              onChange={(e) => setProfitPercent(e.target.value)}
            />
          </div>
        )}
      </div>

      <Button onClick={handleFetchRates} disabled={loading || !weight || !country}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching Rates...
          </>
        ) : (
          'Get Rates'
        )}
      </Button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {results.map(({ type, data }) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="uppercase">{data.service}</CardTitle>
              <p className="text-muted-foreground text-sm">{data.zone} Zone</p>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Weight: {data.weight} kg</p>
              {showProfit && <>
                <p>Rate: ₹{data.rate.toLocaleString("en-IN")} /kg</p>
              <p>Base Charge: ₹{data.baseCharge.toLocaleString("en-IN")}</p>
              <p>Covid Charges: ₹{data.covidCharges.toLocaleString("en-IN")}</p>
              <p>Fuel Charges: ₹{data.fuelCharges.toLocaleString("en-IN")}</p>
              <p>Extra Charges: ₹{data.extraChargeTotal.toLocaleString("en-IN")}</p>
              <p>Profit: ₹{data.profitCharges.toLocaleString("en-IN")} ({data.profitPercent}%)</p>
              </>}
              <p>Total: ₹{data.total.toLocaleString("en-IN")}</p>
              <p>GST: ₹{data.GST.toLocaleString("en-IN")}</p>
              <p className="font-semibold text-green-600">
                Total: ₹{data.totalWithGST.toLocaleString("en-IN", { maximumFractionDigits: 2 })} 
                ({(data.totalWithGST / data.weight).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/kg)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
