//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


 
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


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
//set up userShema to use passportLocalMongoose as a plugin
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
// use passportLocalMongoose to create local log in strategy
passport.use(User.createStrategy());
// set up passport to serialize and deserialized user identification for authentication
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", (req, res) =>{
    res.render("home")
})

app.get("/login", (req, res) =>{
    res.render("login")
})
app.get("/register", (req, res) =>{
    res.render("register")
});

app.get('/secrets', (req, res)=>{
    if(req.isAuthenticated()){
        res.render('secrets')
    }else{
        res.redirect('/login')
    }
})

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
            res.redirect('/register')
        }else{
            passport.authenticate("local") (req, res, function(){
                res.redirect('/secrets')
            })
        }
    })
    
});

app.post('/login', (req, res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err)=>{
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local") (req, res, function(){
                res.redirect('/secrets')
            })  
        }
    })
})










app.listen(3000,function(req,res){
    console.log("Server started on port 3000.");
  })