const users = require("../Models/userModel");
const jwt = require("jsonwebtoken");

// [USER]
//signup
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json("Invalid Data");
    } else {
      const existingUser = await users.findOne({ email });
      // console.log("existing user")
      if (existingUser) {
        res.status(400).json("User Already Exist!!");
      } else {
        const user = new users({
          username: username,
          email: email,
          password: password,
        });
        await user.save();
        if (global.io) {
      global.io.emit("newNotification", {
        message: "New User Registered",
        targetRole: "admin",
      });
    }
        res.status(200).json("Signup Success");
      }
    }
  } catch (err) {
    console.log(err);
    res.status(404).json("Something went wrong");
  }
};

//signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json("Invalid data!!");
  } else {
    const user = await users.findOne({ email: email, password: password });
    if (user) {
      if(user.status==="Blocked"){
        return res.status(403).json({message:"Your account has been blocked by admin !!"})
      }
      if(user.status==="Inactive"){
        return res.status(403).json({message:"Your account is inactive !!"})
      }
      const token = jwt.sign({ email: user?.email,id:user?._id }, process.env.SECRET_KEY);
      res.status(200).json({
          token,username: user?.username,email: user?.email,profile: user?.profile,bio: user?.bio,role: user?.role,createdAt:user?.createdAt
        });
        
    } else {
      res.status(400).json("Invalid Email/Password");
    }
  }
};

//google signin
exports.googleSignin = async (req, res) => {
  try {
    const { username, email, profile,role,bio } = req.body;
    const existingUser = await users.findOne({ email });
    if (!existingUser) {
      const newUser = new users({
        username,
        email,
        profile,
        role,
        bio,
        createdAt
      });
      await newUser.save();
      existingUser=newUser
    }
    if(existingUser.status==="Blocked"){
        return res.status(403).json({message:"Your account has been blocked by admin!!"})
      }
    if(existingUser.status==="Inactive"){
        return res.status(403).json({message:"Your account is inactive!!"})
      }
    const token = jwt.sign({ email:existingUser.email,id:existingUser._id }, process.env.SECRET_KEY);
    res.status(200).json({ token,username:existingUser.username,profile:existingUser.profile,email:existingUser.email,bio:existingUser.bio,role:existingUser.role,createdAt:existingUser.createdAt});
  } 
  catch (err){
    console.log(err);
    res.status(404).json(err);
  }
};

//get all user[ADMIN]
exports.getAllUsers=async(req,res)=>{
  try{
    const usersData=await users.find({
      role:{$ne:"admin"}
    })
    res.status(200).json(usersData)
  }
  catch(err){
    console.log(err)
    res.status(500).json(err)
  }
}

//edit user
exports.editUser=async(req,res)=>{
  try{
    const {id}=req.params
    const {username,status,profile,bio}=req.body
    console.log("editUser hit:", {id, body: req.body});
    const updateData = {}
    if(username !== undefined) updateData.username = username;
    if(status !== undefined) updateData.status = status;
    if(profile !== undefined) updateData.profile = profile;
    if(bio !== undefined) updateData.bio = bio;
    console.log("updateData:", updateData);

    const updateUser=await users.findByIdAndUpdate(
      id,updateData,{new:true}
    )
    console.log("updateUser result:", updateUser);
    res.status(200).json(updateUser)
    if (global.io) {
      global.io.emit("newNotification", {
        message: "Profile Updated Successfully",
        targetUserId: id,
      });
    }
  }
  catch(err){
    console.log(err)
    res.status(500).json(err)
  }
}

//delete user 
exports.deletUser=async(req,res)=>{
  try{
    const {id}=req.params
  await users.findByIdAndDelete(id)
  res.status(200).json("User deleted Successfully")
  }
  catch(err){
    console.log(err)
    res.status(500).json(err)
  }
}
