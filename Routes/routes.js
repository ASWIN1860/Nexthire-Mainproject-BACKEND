const express=require('express')

const userController=require('../Controllers/userController')
const resumeController=require('../Controllers/ResumeController')
const jobController=require('../Controllers/JobController')
const skillController=require('../Controllers/skillController')

const jwtMiddleWare = require('../Middlewares/jwtMiddleware')
const upload=require('../Middlewares/multerMiddleware')

const router=express.Router()

//USER
router.post('/signup',userController.signup)
router.post('/signin',userController.signin)
router.post('/google-login',userController.googleSignin)
router.post('/upload-resume',jwtMiddleWare,upload.single('resume'),resumeController.uploadResume)
router.get('/latest-resume',jwtMiddleWare,resumeController.getLatestResume)
router.get('/resume-history',jwtMiddleWare,resumeController.getResumeHistory)
router.delete('/delete-resume/:id',jwtMiddleWare,resumeController.deleteResume)

//ADMIN
router.post('/add-job',jobController.addJob)
router.post('/add-skill',skillController.addSkill)


module.exports=router