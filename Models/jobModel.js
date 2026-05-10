const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    company: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    salary: {
        type: String
    },

    description: {
        type: String
    },

    skills: {
        type: [String],
        required: true
    }

})

const jobs = mongoose.model("jobs", jobSchema)

module.exports = jobs