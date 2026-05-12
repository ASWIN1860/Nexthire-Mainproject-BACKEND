const jobModel = require("../Models/jobModel");

//add job
exports.addJob = async (req, res) => {
  try {
    const { title, company, location, salary, description, skills,status } = req.body;
    const newJob = new jobModel({
      title,
      company,
      location,
      salary,
      description,
      skills:skills.split(","),
      status,
    });
    await newJob.save();
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
exports.updateJob=async(req,res)=>{
    try{
        console.log(req.body)
        const {id}=req.params
        const updateJob=await jobModel.findByIdAndUpdate(id,req.body,{new:true})
        res.status(200).json(updateJob)
    }
    catch(err){
        console.log(err)
        res.status(500).json(err)
    }
}
