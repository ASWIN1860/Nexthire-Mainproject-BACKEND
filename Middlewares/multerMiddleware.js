const multer=require('multer')
const fs = require('fs')

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        if(!fs.existsSync("./resumeUploads")){
            fs.mkdirSync("./resumeUploads", { recursive: true })
        }
        cb(null,"./resumeUploads")
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+file.originalname)
    }
})

//PDF FILTER
const fileFilter=(req,file,cb)=>{
    if(file.mimetype==="application/pdf"){
        cb(null,true)
    }
    else{
        cb(new Error("Only PDF files allowed"),false)
    }
}

const upload=multer({storage,fileFilter})

module.exports=upload