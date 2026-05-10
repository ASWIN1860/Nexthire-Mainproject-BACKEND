const mongoose=require('mongoose')

const connectionString=process.env.CONNECTION_STRING
mongoose.connect(connectionString).then(res=>{
    console.log("Server Connected With Mongodb Server!!")
}).catch(err=>{
    console.log(err)
})