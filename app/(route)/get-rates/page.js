'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const availableTypes = ['dhl', 'fedex', 'ups', 'dtdc', 'aramex', 'orbit'];

export default function GetRatesPage() {
    const [weight, setWeight] = useState('');
    const [country, setCountry] = useState('');
    const [profitPercent, setProfitPercent] = useState('0');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFetchRates = async () => {
        setLoading(true);
        setError('');
        setResults([]);

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

        const filtered = resultsData.filter((r) => !r.data.error);
        const firstError = resultsData.find((r) => r.data.error);

        if (!filtered.length && firstError) {
            setError(firstError.data.error);
        }

        setResults(filtered);
        setLoading(false);
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
                    <Input
                        placeholder="Eg: India"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    />
                </div>
                <div>
                    <Label>Profit %</Label>
                    <Input
                        type="number"
                        placeholder="Default: 50"
                        value={profitPercent}
                        onChange={(e) => setProfitPercent(e.target.value)}
                    />
                </div>
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
                            <CardTitle className="capitalize">{type}</CardTitle>
                            <p className="text-muted-foreground text-sm">{data.zone} Zone</p>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>Weight: {data.weight} kg</p>
                            <p>Rate: ₹{data.rate} /kg</p>
                            <p>Base Charge: ₹{data.baseCharge}</p>
                            <p>Covid Charges: ₹{data.covidCharges}</p>
                            <p>Fuel Charges: ₹{data.fuelCharges}</p>
                            <p>Extra Charges: ₹{data.extraChargeTotal}</p>
                            <p>Profit: ₹{data.profitCharges} ({data.profitPercent}%)</p>
                            <p className="font-semibold text-green-600">Total: ₹{data.totalWithGST}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
