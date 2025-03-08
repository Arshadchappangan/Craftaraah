const loadHome = async (req,res) => {
    try {
        return res.render("home");
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server Error")
    }
}

const pageNotFound = async (req,res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadLogin = async (req,res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log('Login page not found');
        res.status(500).send('Server Error')
    }
}

module.exports = {
    loadHome,
    pageNotFound,
    loadLogin
}