import { NextResponse } from "next/server";
import { connectToDB } from "@/app/_utils/mongodb";
import Rate from "@/models/Rate"; // Your mongoose model

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const weight = parseFloat(searchParams.get("weight"));
    const country = searchParams.get("country");
    const profitPercent = parseFloat(searchParams.get("profitPercent")) || 0;

    if (!type || !weight || !country) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    await connectToDB();

    try {
        const rateResult = await Rate.findOne({ type });

        if (!rateResult) {
            return NextResponse.json({ error: "Type not found in rates" }, { status: 404 });
        }

        const { rates, zones } = rateResult;

        let selectedZone;
        let extraCharges = {};
        for (const zoneObj of zones) {
            if (zoneObj.countries.includes(country)) {
                selectedZone = zoneObj.zone;
                extraCharges = zoneObj.extraCharges || {};
                break;
            }
        }

        if (!selectedZone) {
            return NextResponse.json({ error: "Zone not found for the given country" }, { status: 404 });
        }

        const roundedWeight = weight.toFixed(2); // No ceil, just 2 decimals
        let weightRate = rates.find((rate) => parseFloat(rate.kg) === parseFloat(roundedWeight));

        if (!weightRate) {
            const sortedRates = rates
                .map(rate => ({ kg: parseFloat(rate.kg), data: rate }))
                .sort((a, b) => b.kg - a.kg);

            const fallbackRate = sortedRates.find(r => r.kg <= weight);
            if (fallbackRate) {
                weightRate = fallbackRate.data;
            } else {
                return NextResponse.json({ error: "No suitable rate found for the weight" }, { status: 404 });
            }
        }

        const zoneRate = weightRate[selectedZone];
        if (!zoneRate) {
            return NextResponse.json({ error: "Rate not found for the selected zone" }, { status: 404 });
        }

        const rate = parseFloat((zoneRate / weight).toFixed(2));
        const baseCharge = parseFloat((rate * weight).toFixed(2));
        let baseCharges = baseCharge;

        // COVID charges
        let covidCharges = 0;
        const covidChargePerKg = 15;
        if (["aramex"].includes(type)) {
            covidCharges = parseFloat((covidChargePerKg * weight).toFixed(2));
        }
        baseCharges += covidCharges;

        // Extra charges
        let extraChargeTotal = 0;
        for (const chargeValue of Object.values(extraCharges)) {
            const charge = parseFloat((chargeValue * weight).toFixed(2));
            extraChargeTotal += charge;
        }
        baseCharges += extraChargeTotal;

        // Fuel charges come last now
        let fuelCharges = 0;
        if (type === "dhl") {
            fuelCharges = parseFloat(((27.5 / 100) * baseCharges).toFixed(2));
        } else if (type === "fedex") {
            fuelCharges = parseFloat(((29 / 100) * baseCharges).toFixed(2));
        } else if (type === "ups") {
            fuelCharges = parseFloat(((30.5 / 100) * baseCharges).toFixed(2));
        } else if (type === "dtdc") {
            fuelCharges = parseFloat(((36 / 100) * baseCharges).toFixed(2));
        } else if (["aramex", "orbit"].includes(type)) {
            fuelCharges = parseFloat(((35.5 / 100) * baseCharges).toFixed(2));
        }
        baseCharges += fuelCharges;

        // Profit
        const profitCharges = parseFloat(((profitPercent / 100) * baseCharges).toFixed(2));
        const total = parseFloat((baseCharges + profitCharges).toFixed(2));

        // GST
        const GST = parseFloat(((18 / 100) * total).toFixed(2));
        const totalWithGST = parseFloat((total + GST).toFixed(2));

        return NextResponse.json({
            service: rateResult.service,
            zone: selectedZone,
            weight: roundedWeight,
            zoneRate: parseFloat(zoneRate.toFixed(2)),
            rate,
            baseCharge,
            covidCharges,
            extraCharges,
            extraChargeTotal,
            fuelCharges,
            baseCharges: parseFloat(baseCharges.toFixed(2)),
            profitPercent,
            profitCharges,
            total,
            GST,
            totalWithGST,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
