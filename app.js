//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
// google strategy constant
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


 
const app = express();
main().catch(err => console.log());

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB', 
    {useNewUrlParser:true}
    );
};
 
app.use(express.static("public"))
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(session({
    secret:"little secret",
    resave: false,
    saveUninitialized: false
}));
app.use (passport.initialize()); //initailized passport
app.use(passport.session());  // use passport to save session
// configuration of google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    //userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // will find a user or create new user through users google id
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
// configuration of Facebook log in strategy
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
//set up userShema to use passportLocalMongoose as a plugin
userSchema.plugin(passportLocalMongoose);
// findorcreate plugin for userSchema
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);
// use passportLocalMongoose to create local log in strategy
passport.use(User.createStrategy());
// set up passport to serialize and deserialized user identification for authentication
passport.serializeUser((user, done) => {
    done(null, user.id);
 });
 
 passport.deserializeUser(async (id, done) => {
   const USER = await User.findById(id);
   done(null, USER);
 });
 


app.get("/", (req, res) =>{
    res.render("home")
})
// google redirection page for register and login
app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }
  ));
// if the user is authenticated will be redirected to the secret page
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect('/secrets');
  });
//facebook redirection page for registration and login
  app.get('/auth/facebook',
  passport.authenticate('facebook'));
// if the user is authenticated will be redirected to the secret page
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) =>{
    res.render("login")
})
app.get("/register", (req, res) =>{
    res.render("register")
});

app.get("/submit", (req, res)=>{
    // if a user is authenticated then he will be redirected to a submit page
   if(req.isAuthenticated()){
    res.render("submit")
   }else{
    //if not will be redirected back to the login page
    res.redirect("/login")
   }
     
})

app.get('/secrets', (req, res)=>{
    //loop through all the users who submited there secrets
   User.find({"secret":{$ne: null}}, (err, foundSecret)=>{
    if(err){
        console.log(err)
    }else{
        //if the secret are found then render them through secrets page
        if(foundSecret){
            res.render('secrets', {usersWithSecrets: foundSecret})
        }
    };
   });
});

app.get('/logout', function(req, res){
    req.logout(function(err) {
      if (err) { console.log(err); }
      res.redirect('/');
    });
  });

app.post('/register', (req, res)=>{
    
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err)
            res.redirect('/register');
        }else{
            //if a new user is succesfully authenticated will be redirected to the secrets page
            passport.authenticate("local") (req, res, function(){
                res.redirect('/secrets');
            });
        };
    });
    
});

app.post('/login', (req, res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local") (req, res, function(){
                res.redirect('/secrets');
            });  
        };
    });
});


app.post('/submit', (req, res)=>{
const submittedSecret = req.body.secret

console.log(req.user.id)
//find the users who submitted his secrets
User.findById(req.user.id, (err, foundUser)=>{
    if(err){
        console.log(err);
    }else{
// if the users is found his secret will be publish and redirected back to the secrets page
        if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
         res.redirect('/secrets')
        });
    };
    
    };
});
   
});







app.listen(3000,function(req,res){
    console.log("Server started on port 3000.");
  })