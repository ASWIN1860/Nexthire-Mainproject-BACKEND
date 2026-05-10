const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String
    },
    bio:{
        type:String,
        default:"Iam a Nexthire user!!"
    },
    profile:{
        type:String,
        default:""
    },
    role:{
        type:String,
        default:"User"
    },
})

const users=mongoose.model('users',userSchema)
module.exports=users