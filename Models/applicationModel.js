const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobs",
      required: true,
    },

    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "resume",
      required: true,
    },

    status: {
      type: String,
      enum: ["Applied", "Interview", "Shortlisted", "Rejected"],
      default: "Applied",
    },
  },
  {
    timestamps: true,
  },
);

const applications = mongoose.model("applications", applicationSchema);

module.exports = applications;
