const User = require('../../models/userSchema');

const loadHome = async (req, res) => {
    try {
        return res.render("home");
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server Error")
    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadLogin = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log('Login page not found');
        res.status(500).send('Server Error')
    }
}

const signup = async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const newUser = new User({ name,email, phone, password });
        await newUser.save();
        console.log(newUser)
        res.redirect('/')
    } catch (error) {
        console.error('Error in saving new user : ', error);
        res.status(500).send('Server Error')
    }
}

module.exports = {
    loadHome,
    pageNotFound,
    loadLogin,
    signup
}