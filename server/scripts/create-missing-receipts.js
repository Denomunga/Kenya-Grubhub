const mongoose = require('mongoose');
const { Sale } = require('../models/Sale');
const { Receipt } = require('../models/Receipt');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kenya-grubhub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createMissingReceipts() {
  try {
    console.log('Starting to create missing receipts...');

    // Get all COMPLETED sales only
    const allSales = await Sale.find({ status: 'Completed' }).sort({ createdAt: -1 });
    console.log(`Found ${allSales.length} completed sales`);

    // Get all existing receipts
    const existingReceipts = await Receipt.find();
    console.log(`Found ${existingReceipts.length} existing receipts`);

    // Create a Set of sale IDs that already have receipts
    const existingSaleIds = new Set(
      existingReceipts.map(receipt => receipt.saleId.toString())
    );

    // Find sales that don't have receipts
    const salesWithoutReceipts = allSales.filter(sale => 
      !existingSaleIds.has(sale._id.toString())
    );

    console.log(`Found ${salesWithoutReceipts.length} sales without receipts`);

    if (salesWithoutReceipts.length === 0) {
      console.log('All sales already have receipts. Nothing to do.');
      return;
    }

    // Create receipts for missing sales
    const createdReceipts = [];
    for (const sale of salesWithoutReceipts) {
      try {
        const receipt = new Receipt({
          saleId: sale._id,
          receiptNumber: sale.receiptNumber,
          receiptData: {
            items: sale.items,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            paymentAmount: sale.paymentAmount,
            change: sale.change,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            cashier: sale.cashier,
            storeLocation: sale.storeLocation
          },
          printCount: 0,
          printedAt: []
        });

        await receipt.save();
        createdReceipts.push(receipt);
        console.log(`✅ Created receipt for sale ${sale.receiptNumber}`);
      } catch (error) {
        console.error(`❌ Failed to create receipt for sale ${sale.receiptNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully created ${createdReceipts.length} missing receipts`);
    console.log('🎉 All sales now have corresponding receipt entries!');

  } catch (error) {
    console.error('❌ Error creating missing receipts:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
createMissingReceipts();
