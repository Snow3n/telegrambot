const mongoose = require('mongoose');
// import { mongoose } from 'mongoose';

const OrderSchema = mongoose.Schema({
    created: Date,
    closed: Boolean,
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        require: true,
    },
    deadline: {
        type: String,
        required: true,
    },
    imageId: String,
    imageUniqId: String,
    rating: {
        type: Number,
        min: 0,
        max: 5,
    },
    status: Boolean,
    price: String,
    userId: String,
    performerId: String,
    paid: Boolean,
    moneyOut: Boolean,
});

module.exports = mongoose.model('Order', OrderSchema);