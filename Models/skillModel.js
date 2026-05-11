const mongoose = require('mongoose')

const skillSchema = new mongoose.Schema({

    skill:{
        type:String,
        required:true,
    },

    aliases:{
        type:[String],
        default:[],
    },

    category:{
        type:String,
        default:"General",
    }

})

const skillModel = mongoose.model("skills",skillSchema)

module.exports = skillModel