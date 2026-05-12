const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema({

  title:{
    type:String
  },

  company:{
    type:String
  },

  location:{
    type:String
  },

  salary:{
    type:String
  },

  description:{
    type:String
  },

  skills:{
    type:[String]
  },

  status:{
    type:String,
    default:"Active"
  }

},
{
  timestamps:true
})

const jobs = mongoose.model("jobs", jobSchema)

module.exports = jobs