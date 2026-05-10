const resume = require("../Models/resumeModel");
const jobModel = require("../Models/jobModel");
const skillModel = require("../Models/skillModel");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const openAI = require("openai");

// upload resume MAIN FEATURE**
const openai = new openAI.OpenAI({
  baseURL: "https://api.groq.com/openai/v1",

  apiKey: process.env.GROQ_API_KEY,
});

exports.uploadResume = async (req, res) => {
  try {
    const userId = req.payload.id;

    if (!req.file) {
      return res.status(400).json("No file uploaded");
    }

    const jobDescription = req.body.jobDescription;

    if (!jobDescription) {
      return res.status(400).json("Please add job description");
    }

    // =========================
    // READ PDF
    // =========================

    const pdfPath = req.file.path;

    const dataBuffer = fs.readFileSync(pdfPath);

    const pdfData = await pdfParse(dataBuffer);

    const extractedText = pdfData.text;

    console.log("Extracted Text :", extractedText);

    // =========================
    // GET ALL SKILLS
    // =========================

    const allSkills = await skillModel.find();

    // =========================
    // NORMALIZED RESUME TEXT
    // =========================

    const normalizedResumeText = extractedText.toLowerCase();

    // =========================
    // MATCHED SKILLS
    // =========================

    const matchedSkills = [];

    allSkills.forEach((item) => {
      (item.aliases || []).forEach((alias) => {
        if (alias.length <= 2) return;

        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const regex = new RegExp(
          `(^|\\s|,|\\.|\\n|\\(|\\))${escapedAlias.toLowerCase()}(?=\\s|,|\\.|\\n|\\(|\\)|$)`,

          "i",
        );

        if (regex.test(normalizedResumeText)) {
          if (!matchedSkills.includes(item.skill)) {
            matchedSkills.push(item.skill);
          }
        }
      });
    });

    console.log("Matched Skills :", matchedSkills);

    // =========================
    // REQUIRED SKILLS
    // =========================

    const requiredSkills = [];

    const normalizedJobDescription = jobDescription.toLowerCase();

    allSkills.forEach((item) => {
      (item.aliases || []).forEach((alias) => {
        if (alias.length <= 2) return;

        if (normalizedJobDescription.includes(alias.toLowerCase())) {
          if (!requiredSkills.includes(item.skill)) {
            requiredSkills.push(item.skill);
          }
        }
      });
    });

    console.log("Required Skills :", requiredSkills);

    // =========================
    // MISSING SKILLS
    // =========================

    const missingSkills = requiredSkills.filter(
      (skill) => !matchedSkills.includes(skill),
    );

    console.log("Missing Skills :", missingSkills);

    // =========================
    // SKILLS MATCH SCORE
    // =========================

    const skillsMatchScore =
      requiredSkills.length > 0
        ? Math.round(
            ((requiredSkills.length - missingSkills.length) /
              requiredSkills.length) *
              100,
          )
        : 0;

    console.log(
      "Skills Match Score :",

      skillsMatchScore,
    );

    // =========================
    // ATS READINESS SCORE
    // =========================

    let atsReadinessScore = 0;

    // EMAIL CHECK

    if (extractedText.match(/\S+@\S+\.\S+/)) {
      atsReadinessScore += 20;
    }

    // PHONE CHECK

    if (extractedText.match(/[0-9]{10}/)) {
      atsReadinessScore += 20;
    }

    // LINKEDIN / GITHUB

    if (
      normalizedResumeText.includes("linkedin") ||
      normalizedResumeText.includes("github")
    ) {
      atsReadinessScore += 10;
    }

    // EXPERIENCE SECTION

    if (normalizedResumeText.includes("experience")) {
      atsReadinessScore += 15;
    }

    // PROJECT SECTION

    if (normalizedResumeText.includes("project")) {
      atsReadinessScore += 15;
    }

    // EDUCATION SECTION

    if (normalizedResumeText.includes("education")) {
      atsReadinessScore += 10;
    }

    // SKILLS SECTION

    if (normalizedResumeText.includes("skills")) {
      atsReadinessScore += 10;
    }

    // LIMIT TO 100

    atsReadinessScore = Math.min(
      atsReadinessScore,

      100,
    );

    console.log(
      "ATS Readiness Score :",

      atsReadinessScore,
    );

    // =========================
    // FINAL RESUME SCORE
    // =========================

    const score = Math.round(
      skillsMatchScore * 0.85 + atsReadinessScore * 0.15,
    );

    console.log("Final Resume Score :", score);

    // =========================
    // MATCH JOBS
    // =========================

    const jobs = await jobModel.find();

    const matchedJobs = jobs.filter((job) =>
      (job.skills || []).some((jobSkill) =>
        matchedSkills.some(
          (resumeSkill) => resumeSkill.toLowerCase() === jobSkill.toLowerCase(),
        ),
      ),
    );

    console.log("Matched Jobs :", matchedJobs);


    // =========================
    // AI ANALYSIS
    // =========================
    let aiResponse = "";

    let strengths = [];

    let weaknesses = [];

    let recommendations = [];

    let experienceLevel = "";

    let resumeCategory = "";

    try {
      const completion =
        await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "user",

              content: `
You are an expert ATS Resume Analyzer AI.

Analyze this resume professionally.

Resume Text:
${extractedText}

Matched Skills:
${matchedSkills.join(", ")}

Missing Skills:
${missingSkills.join(", ")}

Job Description:
${jobDescription}

Return ONLY pure JSON.
Do not use markdown.
Do not use \`\`\`json.
Do not explain anything.

{
  "summary":"",

  "strengths":[""],

  "weaknesses":[""],

  "recommendations":[""],

  "experienceLevel":"",

  "resumeCategory":""
}
`,
            },
          ],

          temperature: 0.7,
        });


      // =========================
      // RAW AI RESPONSE
      // =========================

      const rawResponse =
        completion.choices[0].message.content;

      console.log(
        "RAW AI RESPONSE :",
        rawResponse,
      );

      // =========================
      // CLEAN RESPONSE
      // =========================

      const cleanedResponse = rawResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // =========================
      // PARSE AI JSON
      // =========================

      const parsedAI =
        JSON.parse(cleanedResponse);

      console.log("PARSED AI :", parsedAI);

      aiResponse = parsedAI.summary || "";

      strengths = parsedAI.strengths || [];

      weaknesses = parsedAI.weaknesses || [];

      recommendations =
        parsedAI.recommendations || [];

      experienceLevel =
        parsedAI.experienceLevel || "";

      resumeCategory =
        parsedAI.resumeCategory || "";

      console.log("AI Analysis Success");
    } catch (aiErr) {
      console.log(
        "AI ERROR :",
        aiErr.message,
      );
    }
    // console.log(aiResponse,strengths,weaknesses,recommendations,experienceLevel,resumeCategory)


    // =========================
    // SAVE RESUME
    // =========================

    const newResume = new resume({
      userId,

      resumeFile: req.file.path,

      description: jobDescription,

      extractedText,

      skills: matchedSkills,

      missingSkills,

      matchedJobs,

      score,

      skillsMatchScore,

      atsReadinessScore,

      aiResponse,

      strengths,

      weaknesses,

      recommendations,

      experienceLevel,

      resumeCategory
    });

    await newResume.save();

    // =========================
    // RESPONSE
    // =========================

    res.status(200).json({
      message: "Resume uploaded successfully",

      data: newResume,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json(err);
  }
};

//get latest resume
exports.getLatestResume = async (req, res) => {
  try {
    const userId = req.payload.id;
    const latestResume = await resume
      .findOne({ userId })
      .sort({ createdAt: -1 });
    res.status(200).json({ data: latestResume });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//get resume history
exports.getResumeHistory = async (req, res) => {
  try {
    const userId = req.payload.id;
    const history = await resume.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//delete resume history
exports.deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    await resume.findByIdAndDelete(id);
    res.status(200).json("resume deleted successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
