const skillModel = require("../Models/skillModel");
// ======================
// ADD SKILL
// ======================

exports.addSkill = async (req, res) => {
  try {
    const { skill, aliases, category } = req.body;

    // VALIDATION

    if (!skill || !aliases || !category) {
      return res.status(400).json({
        success: false,

        message: "Please fill all fields",
      });
    }

    // CHECK EXISTING SKILL

    const existingSkill = await skillModel.findOne({
      skill: skill.toLowerCase(),
    });

    if (existingSkill) {
      return res.status(400).json({
        success: false,

        message: "Skill already exists",
      });
    }

    // FORMAT ALIASES

    const formattedAliases = aliases
      .split(",")
      .map((item) => item.trim().toLowerCase());

    // CREATE NEW SKILL

    const newSkill = new skillModel({
      skill: skill.toLowerCase(),

      aliases: formattedAliases,

      category: category.toLowerCase(),
    });

    await newSkill.save();

    res.status(200).json({
      success: true,

      message: "Skill added successfully",

      data: newSkill,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,

      message: "Failed to add skill",
    });
  }
};
