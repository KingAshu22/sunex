import mongoose, { Schema, model, models } from "mongoose";

const FranchiseSchema = new Schema({
    name: String,
    firmName: String,
    code: String,
    email: String,
    contact: String,
    address: String,
    isBranch: String,
    branchOf: String,
    panNo: String,
    aadhaarNo: String,
    gstNo: String,
    bankAccountName: String,
    bankAccountNumber: String,
    bankIfscCode: String,
    password: String,
    rates:[{
        country: String,
        percent: Number,
    }]
});

const Franchise = models.Franchise || model("Franchise", FranchiseSchema);

export default Franchise;
