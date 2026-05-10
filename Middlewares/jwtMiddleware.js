const jwt=require('jsonwebtoken')

const jwtMiddleWare=(req,res,next)=>{
   try{
    const token=req?.headers?.authorization?.split(" ")[1]
    const decode_value=jwt.verify(token,process.env.SECRET_KEY)
    console.log(decode_value)
    req.payload=decode_value
    console.log("Request Hit at JWT Middleware")
    console.log(req.payload)
    next()
   }
   catch(err){
    console.log(err)
    res.status(404).json("Invalid Token")
   }
}

module.exports=jwtMiddleWare