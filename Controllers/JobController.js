const jobModel=require('../Models/jobModel')

//add job
exports.addJob=async(req,res)=>{
    try{
        const{title,company,location,salary,description,skills}=req.body
        const newJob=new jobModel({
            title,company,location,salary,description,skills
        })
        await newJob.save()
        res.status(200).json(newJob)
    }
    catch(err){
        console.log(err)
        res.status(500).json(err)
    }
}