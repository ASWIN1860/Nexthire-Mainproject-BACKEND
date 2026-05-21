const applications = require("../Models/applicationModel");

// apply job

exports.applyJob = async (req, res) => {
  try {
    const userId = req.payload.id;

    const { jobId, resumeId } = req.body;

    // validation

    if (!jobId || !resumeId) {
      return res.status(400).json({
        message: "jobId and resumeId required",
      });
    }

    // duplicate check

    const existingApplication = await applications.findOne({
      userId,
      jobId,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "Already applied for this job",
      });
    }

    // create application

    const newApplication = new applications({
      userId,
      jobId,
      resumeId,
    });

    await newApplication.save();
    if (global.io) {
      global.io.emit("newNotification", {
        message: "New job Application Recieved",
        targetRole: "admin",
      });
    }

    res.status(200).json({
      message: "Applied successfully",
      data: newApplication,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json(err);
  }
};

// get all applications
exports.getAllApplications = async (req, res) => {
  try {
    const allApplications = await applications

      .find()

      // user details

      .populate("userId", "username email")

      // job details

      .populate("jobId", "title")

      // resume details

      .populate(
        "resumeId",
        `
                    score
                    atsReadinessScore
                    skillsMatchScore
                    skills
                    missingSkills
                    aiResponse
                    strengths
                    weaknesses
                    recommendations
                    experienceLevel
                    resumeCategory
                    resumeFile
                    extractedText
                    scores
                    finalVerdict
                    createdAt
                    description
                    `,
      )

      // latest first

      .sort({ createdAt: -1 });

    res.status(200).json(allApplications);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Failed to fetch applications",
    });
  }
};

// get user applications
exports.getUserApplications = async (req, res) => {
  try {
    const userId = req.payload.id;
    const userApplications = await applications
      .find({ userId })
      .populate("jobId", "title")
      .sort({ createdAt: -1 });
    res.status(200).json(userApplications);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to fetch user applications",
    });
  }
};

//update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const updateApplication = await applications.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).populate("jobId", "title");

    if (global.io) {
      global.io.emit("newNotification", {
        message: `Your application status for ${updateApplication.jobId?.title || "Job"} is updated to ${status}`,
        targetUserId: updateApplication.userId.toString(),
      });
    }

    res.status(200).json(updateApplication);
  } catch (err) {
    console.log(err);

    res.status(500).json(err);
  }
};
