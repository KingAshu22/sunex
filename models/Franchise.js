import mongoose, { Schema, model, models } from "mongoose";

const FranchiseSchema = new Schema({
    name: String,
    code: String,
    email: String,
    password: String,
    rates:[{
        country: String,
        percent: Number,
    }]
});

const Franchise = models.Franchise || model("Franchise", FranchiseSchema);

export default Franchise;
