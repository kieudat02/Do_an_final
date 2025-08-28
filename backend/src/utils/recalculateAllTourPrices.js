const mongoose = require('mongoose');
const Tour = require('../models/tourModel');
const TourDetail = require('../models/tourDetailModel');
const { recalculateAndUpdateTourPrice } = require('./priceCalculator');

async function recalculateAllTourPrices() {
    try {
        const tours = await Tour.find({ deleted: false }).select('_id title');

        let successCount = 0;
        let errorCount = 0;

        for (const tour of tours) {
            try {
                await recalculateAndUpdateTourPrice(tour._id);
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }

        return { successCount, errorCount };
    } catch (error) {
        throw error;
    }
}

if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(async () => {
        try {
            await recalculateAllTourPrices();
        } catch (error) {
            // Script failed
        } finally {
            await mongoose.disconnect();
            process.exit(0);
        }
    }).catch(error => {
        process.exit(1);
    });
}

module.exports = { recalculateAllTourPrices };