import { NextResponse } from "next/server";
import { connectToDB } from "@/app/_utils/mongodb";
import Rate from "@/models/Rate";

export async function POST(req) {
  try {
    const { startWeight, endWeight, country, selectedServices, profitPercent, includeGST } = await req.json();

    if (!country || !selectedServices || selectedServices.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    await connectToDB();

    // Get country name for display
    let countryName = country;

    try {
      const sampleRate = await Rate.findOne({});
      if (sampleRate && sampleRate.zones) {
        for (const zone of sampleRate.zones) {
          if (zone.countries && zone.countries.includes(country)) {
            countryName = country.toUpperCase();
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error getting country name:", error);
    }

    // Generate weights array
    const weights = [];
    let currentWeight = Number.parseFloat(startWeight);
    const endWeightFloat = Number.parseFloat(endWeight);

    while (currentWeight <= endWeightFloat) {
      weights.push(currentWeight.toFixed(1));
      currentWeight += 1;
    }

    // Fetch rates for all selected services using their 'originalName'
    const serviceRates = {};
    for (const originalName of selectedServices) {
      try {
        const rateResult = await Rate.findOne({ originalName: originalName });
        if (rateResult) {
          serviceRates[originalName] = rateResult;
        }
      } catch (error) {
        console.error(`Error fetching rates for service ${originalName}:`, error);
      }
    }

    // Process rates for each weight and service
    const results = {
      countryName,
      headers: selectedServices,
      rows: [],
    };

    for (const weight of weights) {
      const weightFloat = Number.parseFloat(weight);
      const row = {
        weight,
        rates: [],
      };

      for (const originalName of selectedServices) {
        const rateData = serviceRates[originalName];

        if (!rateData) {
          row.rates.push(null);
          continue;
        }

        try {
          // --- MODIFICATION START ---
          // Destructure covidCharges and fuelCharges from the rate data
          // We rename them to avoid variable conflicts later
          const {
            rates,
            zones,
            type,
            covidCharges: dbCovidCharges,
            fuelCharges: dbFuelCharges
          } = rateData;
          // --- MODIFICATION END ---


          // Find zone for the country
          let selectedZone;
          let extraCharges = {};
          for (const zoneObj of zones) {
            if (zoneObj.countries && zoneObj.countries.includes(country)) {
              selectedZone = zoneObj.zone;
              extraCharges = zoneObj.extraCharges || {};
              break;
            }
          }

          if (!selectedZone) {
            row.rates.push(null);
            continue;
          }

          // Find rate for the weight
          const roundedWeight = weightFloat.toFixed(2);
          let weightRate = rates.find((rate) => Number.parseFloat(rate.kg) === Number.parseFloat(roundedWeight));

          if (!weightRate) {
            const sortedRates = rates
              .map((rate) => ({ kg: Number.parseFloat(rate.kg), data: rate }))
              .sort((a, b) => b.kg - a.kg);

            const fallbackRate = sortedRates.find((r) => r.kg <= weightFloat);
            if (fallbackRate) {
              weightRate = fallbackRate.data;
            } else {
              row.rates.push(null);
              continue;
            }
          }

          const zoneRate = weightRate[selectedZone];
          if (!zoneRate) {
            row.rates.push(null);
            continue;
          }

          const rate = Number.parseFloat((zoneRate / weightFloat).toFixed(2));
          const baseCharge = Number.parseFloat((rate * weightFloat).toFixed(2));
          let baseCharges = baseCharge;

          // --- DYNAMIC COVID CHARGES LOGIC ---
          let covidCharges = 0;
          // Check if a valid covid charge value exists in the database record
          if (typeof dbCovidCharges === 'number' && dbCovidCharges > 0) {
            // If it exists, use it. (Assuming it's a per-kg rate)
            console.log(`Using DB COVID charge for ${originalName}: ${dbCovidCharges}/kg`);
            covidCharges = Number.parseFloat((dbCovidCharges * weightFloat).toFixed(2));
          } else {
            // Otherwise, fall back to the hardcoded logic
            const covidChargePerKg = 15;
            if (["aramex"].includes(type)) {
              covidCharges = Number.parseFloat((covidChargePerKg * weightFloat).toFixed(2));
            }
          }
          baseCharges += covidCharges;

          // Extra charges
          let extraChargeTotal = 0;
          for (const chargeValue of Object.values(extraCharges)) {
            const charge = Number.parseFloat((chargeValue * weightFloat).toFixed(2));
            extraChargeTotal += charge;
          }
          baseCharges += extraChargeTotal;

          // --- DYNAMIC FUEL CHARGES LOGIC ---
          let fuelCharges = 0;
          // Check if a valid fuel charge value exists in the database record
          if (typeof dbFuelCharges === 'number' && dbFuelCharges > 0) {
            // If it exists, use it. (Assuming it's a percentage)
            console.log(`Using DB Fuel Surcharge for ${originalName}: ${dbFuelCharges}%`);
            fuelCharges = Number.parseFloat(((dbFuelCharges / 100) * baseCharges).toFixed(2));
          } else {
            // Otherwise, fall back to the hardcoded logic
            if (type === "dhl") {
              fuelCharges = Number.parseFloat(((27.5 / 100) * baseCharges).toFixed(2));
            } else if (type === "fedex") {
              fuelCharges = Number.parseFloat(((29 / 100) * baseCharges).toFixed(2));
            } else if (type === "ups") {
              fuelCharges = Number.parseFloat(((30.5 / 100) * baseCharges).toFixed(2));
            } else if (type === "dtdc") {
              fuelCharges = Number.parseFloat(((36 / 100) * baseCharges).toFixed(2));
            } else if (["aramex", "orbit"].includes(type)) {
              fuelCharges = Number.parseFloat(((35.5 / 100) * baseCharges).toFixed(2));
            }
          }
          baseCharges += fuelCharges;

          // Profit
          const profitCharges = Number.parseFloat(((profitPercent / 100) * baseCharges).toFixed(2));
          const total = Number.parseFloat((baseCharges + profitCharges).toFixed(2));

          // GST
          let finalRate;
          if (includeGST) {
            const GST = Number.parseFloat(((18 / 100) * total).toFixed(2));
            finalRate = Number.parseFloat((total + GST).toFixed(2));
          } else {
            finalRate = total;
          }

          // Calculate rate per kg
          const ratePerKg = Number.parseFloat((finalRate / weightFloat).toFixed(2));
          row.rates.push(ratePerKg);
        } catch (error) {
          console.error(`Error calculating rate for service ${originalName}, weight ${weight}:`, error);
          row.rates.push(null);
        }
      }

      results.rows.push(row);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Rate range calculation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}