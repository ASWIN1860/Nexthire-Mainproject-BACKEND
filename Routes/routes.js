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
router.get('/latest-resume/:id',jwtMiddleWare,resumeController.getLatestResume)
router.get('/resume-history',jwtMiddleWare,resumeController.getResumeHistory)
router.delete('/delete-resume/:id',jwtMiddleWare,resumeController.deleteResume)

//ADMIN
router.post('/add-job',jwtMiddleWare,jobController.addJob)
router.post('/add-skill',jwtMiddleWare,skillController.addSkill)
router.get('/all-jobs',jwtMiddleWare,jobController.getAllJobs)
router.delete('/delete-job/:id',jwtMiddleWare,jobController.deleteJob)
router.put('/update-job/:id',jwtMiddleWare,jobController.updateJob)
router.get('/all-users',jwtMiddleWare,userController.getAllUsers)
router.get('/resume/:id',jwtMiddleWare,resumeController.getResumeByUserId)
router.put('/edit-user/:id',jwtMiddleWare,userController.editUser)
router.delete('/delete-user/:id',jwtMiddleWare,userController.deletUser)


module.exports=router