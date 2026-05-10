const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    resumeFile: {
      type: String,
    },

    description: {
      type: String,
    },

    extractedText: {
      type: String,
    },

    skills: {
      type: [String],
    },

    missingSkills: {
      type: [String],
    },

    matchedJobs: {
      type: Array,
    },

    score: {
      type: Number,
    },

    skillsMatchScore: {
      type: Number,
    },

    atsReadinessScore: {
      type: Number,
    },

    aiResponse: {
      type: String,
    },

    strengths: {
      type: [String],
    },

    weaknesses: {
      type: [String],
    },

    recommendations: {
      type: [String],
    },

    experienceLevel: {
      type: String,
    },

    resumeCategory: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("resume", resumeSchema);