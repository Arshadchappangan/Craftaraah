const express = require('express');
const app = express(); 
const path = require('path');
const env = require('dotenv').config();
const db = require('./config/db');
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const session = require('express-session');
const passport = require('./config/passport')


app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : false,
    cookie : {
        secure : false,
        httpOnly : true,
        maxAge : 24*60*60*1000
    }
}));

app.set('view engine','ejs');
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname,'public')));
app.use('/uploads', express.static('public/uploads'));


app.use('/',userRouter)
app.use('/admin',adminRouter)

app.use(passport.initialize());
app.use(passport.session());

app.listen(process.env.PORT,() => {
    console.log("Server Running on the PORT : ",process.env.PORT)
})
db()



