const jobModel = require("../Models/jobModel");
const resume = require("../Models/resumeModel");

//add job
exports.addJob = async (req, res) => {
  try {
    const { title, company, location, salary, description, skills, status } =
      req.body;
    const newJob = new jobModel({
      title,
      company,
      location,
      salary,
      description,
      skills: skills.split(","),
      status,
    });
    await newJob.save();
    if (global.io) {
      global.io.emit("newNotification", {
        message: "New Job Posted",
        targetRole: "user",
      });
    }
    res.status(200).json(newJob);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const allJobs = await jobModel.find();
    res.status(200).json(allJobs);
  } catch (err) {
    res.status(500).json(err);
  }
};

//delete jobs
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    await jobModel.findByIdAndDelete(id);
    res.status(200).json("Job deleted successfully ");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//update job
exports.updateJob = async (req, res) => {
  try {
    console.log(req.body);
    const { id } = req.params;
    const updateJob = await jobModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (global.io) {
      global.io.emit("newNotification", {
        message: `Job updated: ${updateJob.title}`,
        targetRole: "user",
      });
    }
    res.status(200).json(updateJob);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};



// GET MATCHED JOBS


exports.getMatchedJobs = async (req, res) => {

  try {

    const userId = req.payload.id;

    // =====================================
    // GET LATEST RESUME
    // =====================================

    const latestResume = await resume
      .findOne({ userId })
      .sort({ createdAt: -1 });

    if (!latestResume) {

      return res.status(404).json({
        message: "No resume found",
      });

    }

    // =====================================
    // RESUME SKILLS
    // =====================================

    const resumeSkills =
      latestResume.skills || [];

    // =====================================
    // GET ACTIVE JOBS
    // =====================================

    const allJobs = await jobModel.find({
      status: "Active",
    });

    // =====================================
    // MATCH LOGIC
    // =====================================

    const matchedJobs = allJobs.map((job) => {

      const jobSkills =
        job.skills || [];

      // ============================
      // MATCHED SKILLS
      // ============================

      const matchedSkills =
        jobSkills.filter((skill) =>

          resumeSkills.some(
            (resumeSkill) =>

              resumeSkill
                .toLowerCase()
                .includes(
                  skill.toLowerCase()
                )

              ||

              skill
                .toLowerCase()
                .includes(
                  resumeSkill.toLowerCase()
                )

          )

        );

      // ============================
      // MISSING SKILLS
      // ============================

      const missingSkills =
        jobSkills.filter(
          (skill) =>

            !resumeSkills.some(
              (resumeSkill) =>

                resumeSkill
                  .toLowerCase()
                  .includes(
                    skill.toLowerCase()
                  )

                ||

                skill
                  .toLowerCase()
                  .includes(
                    resumeSkill.toLowerCase()
                  )

            )

        );

      // ============================
      // SKILL SCORE
      // ============================

      let skillScore = 0;

      if (jobSkills.length > 0) {

        skillScore = Math.round(

          (matchedSkills.length /
            jobSkills.length) * 100

        );

      }

      // ============================
      // ATS SCORE
      // ============================

      const atsScore =
        latestResume.score || 0;

      // ============================
      // EXPERIENCE BONUS
      // ============================

      let experienceBonus = 0;

      if (
        latestResume.experienceLevel ===
        "Advanced"
      ) {

        experienceBonus = 10;

      }

      else if (
        latestResume.experienceLevel ===
        "Intermediate"
      ) {

        experienceBonus = 5;

      }

      // ============================
      // FINAL MATCH %
      // ============================

      let matchPercentage =
        Math.round(

          skillScore * 0.7 +

          atsScore * 0.2 +

          experienceBonus

        );

      // realistic limit

      if (matchPercentage > 95) {

        matchPercentage = 95;

      }

      // =====================================
      // RETURN
      // =====================================

      return {

        ...job._doc,

        matchedSkills,

        missingSkills,

        skillScore,

        atsScore,

        matchPercentage,

      };

    });

    // =====================================
    // SORT HIGH MATCH FIRST
    // =====================================

    matchedJobs.sort(

      (a, b) =>

        b.matchPercentage -
        a.matchPercentage

    );

    // =====================================
    // RESPONSE
    // =====================================

    res.status(200).json(
      matchedJobs
    );

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message:
        "Failed to fetch matched jobs",

    });

  }

};