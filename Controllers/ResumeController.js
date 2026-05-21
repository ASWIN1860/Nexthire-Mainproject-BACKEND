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

    // =========================
    // VALIDATION
    // =========================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const jobDescription = req.body.jobDescription;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        message: "Please add job description",
      });
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
    // NORMALIZE TEXT
    // =========================

    const normalizedResumeText = extractedText.toLowerCase();

    const normalizedJobDescription = jobDescription.toLowerCase();

    // =========================
    // MATCHED SKILLS
    // =========================

    let matchedSkills = [];

    allSkills.forEach((item) => {
      (item.aliases || []).forEach((alias) => {
        if (alias.length <= 2) return;

        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const regex = new RegExp(
          `(^|\\s|,|\\.|\\n|\\(|\\))${escapedAlias.toLowerCase()}(?=\\s|,|\\.|\\n|\\(|\\)|$)`,
          "i",
        );

        if (regex.test(normalizedResumeText)) {
          matchedSkills.push(item.skill);
        }
      });
    });

    matchedSkills = [...new Set(matchedSkills)];

    console.log("Matched Skills :", matchedSkills);

    // =========================
    // REQUIRED SKILLS
    // =========================

    let requiredSkills = [];

    allSkills.forEach((item) => {
      (item.aliases || []).forEach((alias) => {
        if (alias.length <= 2) return;

        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const regex = new RegExp(
          `(^|\\s|,|\\.|\\n|\\(|\\))${escapedAlias.toLowerCase()}(?=\\s|,|\\.|\\n|\\(|\\)|$)`,
          "i",
        );

        if (regex.test(normalizedJobDescription)) {
          requiredSkills.push(item.skill);
        }
      });
    });

    requiredSkills = [...new Set(requiredSkills)];

    console.log("Required Skills :", requiredSkills);

    // =========================
    // MISSING SKILLS
    // =========================

    const missingSkills = requiredSkills.filter(
      (skill) => !matchedSkills.includes(skill),
    );

    console.log("Missing Skills :", missingSkills);

    // =========================
    // ATS READINESS SCORE  (max 100, dynamic per resume)
    // =========================

    let atsReadinessScore = 0;

    // EMAIL (max 8)
    if (/\S+@\S+\.\S+/.test(extractedText)) {
      atsReadinessScore += 8;
    }

    // PHONE (max 7)
    if (/(\+91[\-\s]?)?[6-9]\d{9}/.test(extractedText)) {
      atsReadinessScore += 7;
    }

    // LINKEDIN (max 5)
    if (normalizedResumeText.includes("linkedin")) {
      atsReadinessScore += 5;
    }

    // GITHUB (max 5)
    if (normalizedResumeText.includes("github")) {
      atsReadinessScore += 5;
    }

    // IMPORTANT SECTIONS — each worth 4 points (max 24)
    const importantSections = [
      "experience",
      "education",
      "skills",
      "project",
      "certification",
      "internship",
    ];

    importantSections.forEach((section) => {
      if (normalizedResumeText.includes(section)) {
        atsReadinessScore += 4;
      }
    });

    // ACTION WORDS — 2 pts each, max 12
    const actionWords = [
      "developed",
      "built",
      "created",
      "implemented",
      "managed",
      "optimized",
      "designed",
      "improved",
      "led",
      "engineered",
      "delivered",
      "architected",
      "launched",
      "reduced",
      "increased",
    ];

    const foundActionWords = actionWords.filter((word) =>
      normalizedResumeText.includes(word),
    );

    atsReadinessScore += Math.min(foundActionWords.length * 2, 12);

    // WORD COUNT (max 10)
    const wordCount = extractedText.split(/\s+/).length;

    if (wordCount >= 400 && wordCount <= 900) {
      atsReadinessScore += 10;
    } else if (wordCount >= 300) {
      atsReadinessScore += 7;
    } else if (wordCount >= 150) {
      atsReadinessScore += 4;
    }

    // EXPERIENCE YEARS MENTIONED (max 6)
    const experienceMatches =
      extractedText.match(/([0-9]+)\+?\s*(years|year)/gi) || [];

    if (experienceMatches.length >= 2) {
      atsReadinessScore += 6;
    } else if (experienceMatches.length === 1) {
      atsReadinessScore += 3;
    }

    // PROJECT COUNT (max 6)
    const projectMatches = extractedText.match(/project/gi) || [];

    if (projectMatches.length >= 3) {
      atsReadinessScore += 6;
    } else if (projectMatches.length >= 2) {
      atsReadinessScore += 4;
    } else if (projectMatches.length >= 1) {
      atsReadinessScore += 2;
    }

    // CERTIFICATIONS (max 5)
    const certificationMatches =
      extractedText.match(/certification|certificate/gi) || [];

    if (certificationMatches.length >= 2) {
      atsReadinessScore += 5;
    } else if (certificationMatches.length === 1) {
      atsReadinessScore += 3;
    }

    // CLEANNESS — special chars penalty logic (max 5)
    const specialCharacters = extractedText.match(/[^\w\s.,()-]/g) || [];

    if (specialCharacters.length < 15) {
      atsReadinessScore += 5;
    } else if (specialCharacters.length < 30) {
      atsReadinessScore += 3;
    }

    // QUANTIFIED ACHIEVEMENTS — numbers with % or metrics (max 7)
    const quantifiedMatches =
      extractedText.match(
        /\d+\s*(%|percent|x\b|times|users|ms|kb|mb|gb|hrs?|days?|months?)/gi,
      ) || [];

    if (quantifiedMatches.length >= 3) {
      atsReadinessScore += 7;
    } else if (quantifiedMatches.length >= 1) {
      atsReadinessScore += 3;
    }

    // CAP ATS SCORE
    atsReadinessScore = Math.min(atsReadinessScore, 100);

    console.log("ATS Readiness Score :", atsReadinessScore);

    // =========================
    // SKILLS MATCH SCORE  (realistic, non-capped)
    // =========================

    let skillsMatchScore = 0;

    if (requiredSkills.length > 0) {
      // Only count matched skills that are actually in required skills
      const trueMatched = matchedSkills.filter((skill) =>
        requiredSkills.some((req) => req.toLowerCase() === skill.toLowerCase()),
      );

      skillsMatchScore = Math.round(
        (trueMatched.length / requiredSkills.length) * 100,
      );
    } else {
      // No required skills detected from JD → give a neutral base
      skillsMatchScore = matchedSkills.length >= 5 ? 50 : 30;
    }

    // Realistic soft cap — no hard bracket manipulation
    skillsMatchScore = Math.min(skillsMatchScore, 95);

    console.log("Skills Match Score :", skillsMatchScore);

    // =========================
    // BONUS SCORE  (balanced, max ~20)
    // =========================

    let bonusScore = 0;

    // HIGH SKILL COUNT (max 5)
    if (matchedSkills.length >= 12) {
      bonusScore += 5;
    } else if (matchedSkills.length >= 8) {
      bonusScore += 3;
    } else if (matchedSkills.length >= 5) {
      bonusScore += 1;
    }

    // EXPERIENCE BONUS (max 3)
    if (normalizedResumeText.includes("experience")) {
      bonusScore += 3;
    }

    // PROJECT BONUS (max 3)
    const totalProjects = (normalizedResumeText.match(/project/gi) || [])
      .length;

    if (totalProjects >= 3) {
      bonusScore += 3;
    } else if (totalProjects >= 1) {
      bonusScore += 1;
    }

    // CERTIFICATION BONUS (max 2)
    if (normalizedResumeText.includes("certification")) {
      bonusScore += 2;
    }

    // INTERN EXPERIENCE BONUS (max 3)
    if (normalizedResumeText.includes("intern")) {
      bonusScore += 3;
    }

    // DEVELOPER KEYWORD BONUS (max 2)
    if (normalizedResumeText.includes("developer")) {
      bonusScore += 2;
    }

    // QUANTIFIED ACHIEVEMENTS BONUS (max 4)
    const quantifiedBonus =
      extractedText.match(/\d+\s*(%|percent|x\b|times|users|ms|kb|mb|gb)/gi) ||
      [];

    if (quantifiedBonus.length >= 3) {
      bonusScore += 4;
    } else if (quantifiedBonus.length >= 1) {
      bonusScore += 2;
    }

    // PROFILE/SUMMARY SECTION BONUS (max 2)
    if (
      normalizedResumeText.includes("summary") ||
      normalizedResumeText.includes("objective") ||
      normalizedResumeText.includes("profile")
    ) {
      bonusScore += 2;
    }

    console.log("Bonus Score :", bonusScore);

    // =========================
    // PENALTY SCORE  (realistic deductions)
    // =========================

    let penaltyScore = 0;

    // TOO MANY MISSING SKILLS
    if (missingSkills.length >= 8) {
      penaltyScore += 12;
    } else if (missingSkills.length >= 5) {
      penaltyScore += 7;
    } else if (missingSkills.length >= 3) {
      penaltyScore += 3;
    }

    // VERY SHORT RESUME
    if (wordCount < 150) {
      penaltyScore += 15;
    } else if (wordCount < 250) {
      penaltyScore += 8;
    }

    // NO EXPERIENCE SECTION
    if (!normalizedResumeText.includes("experience")) {
      penaltyScore += 5;
    }

    // GENERIC RESUME PENALTY — no achievements or impact words
    if (
      !normalizedResumeText.includes("achievement") &&
      !normalizedResumeText.includes("optimized") &&
      !normalizedResumeText.includes("improved") &&
      !normalizedResumeText.includes("increased") &&
      !normalizedResumeText.includes("reduced")
    ) {
      penaltyScore += 5;
    }

    // NO QUANTIFIED RESULTS
    const hasMetrics = extractedText.match(
      /\d+\s*(%|percent|x\b|times|users|ms)/gi,
    );

    if (!hasMetrics || hasMetrics.length === 0) {
      penaltyScore += 5;
    }

    // NO CONTACT INFO
    if (
      !/\S+@\S+\.\S+/.test(extractedText) &&
      !/(\+91[\-\s]?)?[6-9]\d{9}/.test(extractedText)
    ) {
      penaltyScore += 8;
    }

    console.log("Penalty Score :", penaltyScore);

    // =========================
    // FINAL SCORE  (dynamic, no hard 92 cap)
    // =========================

    let score = Math.round(
      skillsMatchScore * 0.5 +
        atsReadinessScore * 0.3 +
        bonusScore -
        penaltyScore,
    );

    // Realistic upper cap — only truly exceptional resumes hit near 90
    if (score > 90) {
      score = 90;
    }

    // Minimum floor
    if (score < 10) {
      score = 10;
    }

    console.log("Final Resume Score :", score);

    // =========================
    // RESUME LEVEL
    // =========================

    let resumeLevel = "";

    if (score >= 85) {
      resumeLevel = "Excellent";
    } else if (score >= 70) {
      resumeLevel = "Strong";
    } else if (score >= 55) {
      resumeLevel = "Good";
    } else if (score >= 35) {
      resumeLevel = "Average";
    } else {
      resumeLevel = "Needs Improvement";
    }

    console.log("Resume Level :", resumeLevel);

    // =========================
    // RECOMMENDED SKILLS
    // =========================

    const recommendedSkills = missingSkills.slice(0, 5);

    // =========================
    // MATCH JOBS
    // =========================

    const jobs = await jobModel.find();

    const matchedJobs = jobs.filter((job) => {
      const matchedCount = (job.skills || []).filter((jobSkill) =>
        matchedSkills.some(
          (resumeSkill) => resumeSkill.toLowerCase() === jobSkill.toLowerCase(),
        ),
      ).length;

      return matchedCount >= 2;
    });

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
    let atsAnalysis = {};
    let scores = {};
    let keywordDensity = {};
    let projectAnalysis = {};
    let experienceAnalysis = {};
    let achievementAnalysis = {};
    let technicalDepthAnalysis = {};
    let competitivenessAnalysis = {};
    let jobFitAnalysis = {};
    let improvementSuggestions = [];
    let finalVerdict = "";

    try {
      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `You are an advanced enterprise-grade ATS Resume Analyzer AI used by top recruiters, hiring managers, and modern AI recruitment platforms.

Your task is to deeply analyze a candidate's resume against a given job description and return highly professional ATS-style insights.

You must behave like:
- A Senior Technical Recruiter
- ATS Scoring Engine
- Resume Optimization Expert
- Hiring Manager

Your analysis must be:
- Realistic
- Strict
- Professional
- Detailed
- Actionable
- ATS-focused
- Recruiter-level intelligent

==================================================
IMPORTANT RULES
==================================================

- NEVER give unrealistic praise
- NEVER imply resume perfection
- NEVER behave overly positive
- ALWAYS identify weaknesses
- ALWAYS provide actionable recommendations
- Be concise but insightful
- Avoid repeated points
- Focus on technical relevance and ATS optimization
- Return ONLY valid JSON
- Do NOT use markdown
- Do NOT use \`\`\`json
- Do NOT explain anything outside JSON
- If the resume appears generic, repetitive, beginner-level, lacks measurable impact, or lacks technical depth, reduce the evaluation quality significantly even if skill matching is high
- Prioritize quality over quantity of skills
- Analyze resume like a real recruiter reviewing hundreds of applications

==================================================
ANALYSIS FACTORS
==================================================

Evaluate the resume based on:

1. ATS Compatibility
- Resume structure
- ATS readability
- Formatting friendliness
- Section organization
- Resume parsing quality

2. Skills Match
- Technical skill relevance
- Matching technologies
- Missing required skills
- Skill diversity
- Modern technology alignment

3. Experience Quality
- Internship relevance
- Project quality
- Real-world exposure
- Leadership indicators
- Industry exposure

4. Resume Content Quality
- Action verbs
- Achievement-focused writing
- Clarity
- Professional tone
- Technical communication quality

5. Job Relevance
- Alignment with job description
- Domain suitability
- Technical compatibility
- Role relevance

6. Resume Strength
- Competitive level
- Hiring potential
- Industry readiness
- Interview readiness

7. Achievement Impact
- Quantified achievements
- Performance improvements
- Business impact
- Metrics and measurable outcomes

8. Technical Depth
- Advanced technical understanding
- Architecture awareness
- Backend/frontend complexity
- Production-level exposure
- Scalability understanding

9. Resume Competitiveness
- Market competitiveness
- Recruiter attractiveness
- Interview potential
- Hiring probability
- Candidate uniqueness

10. Keyword Effectiveness
- Keyword frequency
- Keyword placement
- ATS keyword strength
- Technical keyword optimization
- Keyword relevance

==================================================
SCORING RULES
==================================================

Use realistic ATS-style scoring logic:

90-92 = Excellent
75-89 = Strong
60-74 = Good
40-59 = Average
Below 40 = Weak

NEVER imply perfection.
NEVER return unrealistic scoring behavior.

Even strong resumes should still contain weaknesses and improvement areas.

==================================================
RETURN FORMAT
==================================================

Return ONLY this exact JSON structure:

{
  "summary": "",

  "atsAnalysis": {
    "atsCompatibility": "",
    "formattingIssues": [],
    "keywordOptimization": "",
    "readability": ""
  },

  "scores": {
    "skillsMatch": 0,
    "atsReadiness": 0,
    "experienceQuality": 0,
    "projectStrength": 0,
    "technicalDepth": 0,
    "achievementImpact": 0,
    "overallScore": 0
  },

  "strengths": [],

  "weaknesses": [],

  "missingSkills": [],

  "recommendedSkills": [],

  "recommendations": [],

  "keywordDensity": {
    "strongKeywords": [],
    "missingKeywords": [],
    "overusedKeywords": []
  },

  "projectAnalysis": {
    "projectQuality": "",
    "technicalComplexity": "",
    "realWorldRelevance": "",
    "scalabilityAwareness": ""
  },

  "experienceAnalysis": {
    "experienceLevel": "",
    "industryReadiness": "",
    "leadershipIndicators": "",
    "professionalMaturity": ""
  },

  "achievementAnalysis": {
    "quantifiedImpact": "",
    "businessImpact": "",
    "measurableResults": ""
  },

  "technicalDepthAnalysis": {
    "technicalMaturity": "",
    "architectureKnowledge": "",
    "productionReadiness": ""
  },

  "competitivenessAnalysis": {
    "marketCompetitiveness": "",
    "interviewProbability": "",
    "hiringPotential": ""
  },

  "jobFitAnalysis": {
    "jobFitPercentage": 0,
    "technicalAlignment": "",
    "domainFit": "",
    "roleSuitability": ""
  },

  "improvementSuggestions": [
    {
      "issue": "",
      "solution": "",
      "expectedImpact": ""
    }
  ],

  "finalVerdict": ""
}

==================================================
INPUTS
==================================================

Resume Text:
${extractedText}

Matched Skills:
${matchedSkills.join(", ")}

Missing Skills:
${missingSkills.join(", ")}

Job Description:
${jobDescription}`,
          },
        ],
        temperature: 0.7,
      });

      const rawResponse = completion.choices[0].message.content;
      console.log("RAW AI RESPONSE :", rawResponse);

      const cleanedResponse = rawResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsedAI = JSON.parse(cleanedResponse);

      aiResponse = parsedAI.summary || "";
      strengths = parsedAI.strengths || [];
      weaknesses = parsedAI.weaknesses || [];
      recommendations = parsedAI.recommendations || [];

      experienceLevel = parsedAI.experienceAnalysis?.experienceLevel || "";
      resumeCategory = parsedAI.finalVerdict || "";

      atsAnalysis = parsedAI.atsAnalysis || {};
      scores = parsedAI.scores || {};
      keywordDensity = parsedAI.keywordDensity || {};
      projectAnalysis = parsedAI.projectAnalysis || {};
      experienceAnalysis = parsedAI.experienceAnalysis || {};
      achievementAnalysis = parsedAI.achievementAnalysis || {};
      technicalDepthAnalysis = parsedAI.technicalDepthAnalysis || {};
      competitivenessAnalysis = parsedAI.competitivenessAnalysis || {};
      jobFitAnalysis = parsedAI.jobFitAnalysis || {};
      improvementSuggestions = parsedAI.improvementSuggestions || [];
      finalVerdict = parsedAI.finalVerdict || "";

      console.log("AI Analysis Success");
    } catch (aiErr) {
      console.log("AI ERROR :", aiErr.message);
    }

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
      recommendedSkills,
      matchedJobs,
      score,
      resumeLevel,
      skillsMatchScore,
      atsReadinessScore,
      bonusScore,
      penaltyScore,
      aiResponse,
      strengths,
      weaknesses,
      recommendations,
      experienceLevel,
      resumeCategory,
      atsAnalysis,
      scores,
      keywordDensity,
      projectAnalysis,
      experienceAnalysis,
      achievementAnalysis,
      technicalDepthAnalysis,
      competitivenessAnalysis,
      jobFitAnalysis,
      improvementSuggestions,
      finalVerdict,
    });

    await newResume.save();

    if (global.io) {
      global.io.emit("newNotification", {
        message: `New Resume Uploaded. AtsScore is:${atsReadinessScore}`,
        targetUserId: userId,
      });
    }

    // =========================
    // RESPONSE
    // =========================

    res.status(200).json({
      success: true,

      message: "Resume uploaded successfully",

      data: newResume,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to upload resume",
    });
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
    if (global.io) {
      global.io.emit("newNotification", {
        message: "Resume Deleted!!",
        targetUserId: req.payload.id,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//get latest resume by user id
exports.getResumeByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    const latestResume = await resume
      .findOne({ userId: id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      resume: latestResume,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//get all resume
exports.getAllResume = async (req, res) => {
  try {
    const resumes = await resume.find();
    res.status(200).json(resumes);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

//get single resume
exports.getSingleResume = async (req, res) => {
  try {
    const { id } = req.params;

    const singleResume = await resume.findById(id);

    res.status(200).json({
      success: true,
      data: singleResume,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json(err);
  }
};
