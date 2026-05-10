const skillModel=require('../Models/skillModel')

//add skill
exports.addSkill=async(req,res)=>{
    try{
        const{skill,aliases,category}=req.body
        const newSkill=new skillModel({
            skill,aliases,category
        })
        await newSkill.save()
        res.status(200).json(newSkill)
    }
    catch(err){
        console.log(err)
        res.status(500).json(err)
    }
}