// models/Lead.js
const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  date:            { type: Date, required: true },
  clientResponse:  { type: String, default: '' }, // e.g., "asked for quote", "no reply", "interested"
  notes:           { type: String, default: '' },
  addedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who logged this follow-up
});

const addressSchema = new mongoose.Schema(
  {
    streetAddress: { type: String, default: '' },
    city:          { type: String, default: '' },
    state:         { type: String, default: '' },
    postalCode:    { type: String, default: '' },
    country:       { type: String, default: '' },
  },
  { _id: false }
);

/**
 * NOTE: We removed "status" per your request and will drive the lead via "stage".
 * Priority & Estimated Budget are included.
 * Address & Tags are included.
 */
const leadSchema = new mongoose.Schema(
  {
    // Ownership / actors
    leadBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who created the lead
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional: who handles it now

    // Client & project
    clientName:     { type: String, required: true },
    companyName:    { type: String, default: '' },
    clientEmail:    { type: String, default: '' },
    clientMobile:   { type: String, default: '' },
    projectDetails: { type: String, default: '' },

    // Source / platform
    platform:    { type: mongoose.Schema.Types.ObjectId, ref: 'Platform' }, // existing Platform model
    platformNote:{ type: String, default: '' }, // if you want to capture "other" source text

    // The 5 additions you asked for
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    estimatedBudget: { type: Number, min: 0, default: 0 },
    stage: {
      type: String,
      enum: [
        'New',
        'Contacted',
        'In Discussion',
        'Proposal Sent',
        'Negotiation',
        'Won',
        'Lost',
        'On Hold',
        'No Reply'
      ],
      default: 'New',
      index: true,
    },
    address: addressSchema,
    tags:    [{ type: String, trim: true }],

    // Dates
    dateCreated:       { type: Date, default: Date.now }, // your original "date"
    nextFollowUpDate:  { type: Date },                    // your original "next followback date"

    // History
    followUps: [followUpSchema], // array of { date, clientResponse, notes, addedBy }

    // Notes
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Helpful indexes
leadSchema.index({ clientName: 'text', projectDetails: 'text', notes: 'text', tags: 'text' });
leadSchema.index({ nextFollowUpDate: 1 });

module.exports = mongoose.model('Lead', leadSchema);
