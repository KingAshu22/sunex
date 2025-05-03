import { NextResponse } from "next/server";
import { connectToDB } from "@/app/_utils/mongodb";
import Rate from "@/models/Rate"; // Your mongoose model

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const weight = parseFloat(searchParams.get("weight"));
    const country = searchParams.get("country");
    const profitPercent = parseFloat(searchParams.get("profitPercent")) || 50;

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

        const roundedWeight = (Math.ceil(weight) + 0.0).toFixed(1).toString();
        const weightRate = rates.find((rate) => rate.kg == roundedWeight);

        if (!weightRate) {
            return NextResponse.json({ error: "Rate not found for the given weight" }, { status: 404 });
        }

        const zoneRate = weightRate[selectedZone];
        if (!zoneRate) {
            return NextResponse.json({ error: "Rate not found for the selected zone" }, { status: 404 });
        }

        const rate = Math.ceil(Math.ceil(zoneRate) / weight);
        let baseCharges = rate * weight;
        const baseCharge = baseCharges;

        let covidCharges = 0;
        const covidChargePerKg = 15;

        if (["aramex"].includes(type)) {
            covidCharges = Math.ceil(covidChargePerKg * weight);
        }

        baseCharges += covidCharges;

        let fuelCharges = 0;
        if (type === "dhl" || type === "fedex") {
            fuelCharges = Math.ceil((30 / 100) * baseCharges);
        } else if (type === "ups") {
            fuelCharges = Math.ceil((30.5 / 100) * baseCharges);
        } else if (type === "dtdc") {
            fuelCharges = Math.ceil((36 / 100) * baseCharges);
        } else if (["aramex", "orbit"].includes(type)) {
            fuelCharges = Math.ceil((25 / 100) * baseCharges);
        }

        baseCharges += fuelCharges;

        let extraChargeTotal = 0;
        for (const chargeValue of Object.values(extraCharges)) {
            const charge = Math.ceil(chargeValue * weight);
            extraChargeTotal += charge;
        }

        baseCharges += extraChargeTotal;

        let profitCharges = 0;
        profitCharges = Math.ceil((profitPercent / 100) * baseCharges);

        const total = baseCharges + profitCharges;
        const GST = (18 / 100) * total;
        const totalWithGST = Math.ceil(total + GST);

        return NextResponse.json({
            zone: selectedZone,
            weight: roundedWeight,
            rate,
            baseCharge,
            covidCharges,
            fuelCharges,
            extraCharges,
            extraChargeTotal,
            baseCharges,
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
