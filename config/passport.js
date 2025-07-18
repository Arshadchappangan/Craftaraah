const passport = require('passport');
const googleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config();

passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
},

    async (req,accessToken, refrechToken, profile, done) => {
        try {


            let user = await User.findOne({ googleId: profile.id })
            if (user) {
                return done(null, user)
            } 

            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            }

            const namePart = profile.displayName.slice(0, 3).toUpperCase();
            const numberPart = Math.floor(1000 + Math.random() * 9000);
            const domain = process.env.BASE_URL;
            const referralLink = `${domain}?ref=${namePart}${numberPart}`;

                user = new User({
                    name : profile.displayName,
                    email : profile.emails[0].value,
                    googleId : profile.id,
                    referral: {
                        link: referralLink
                    }
                })

                await user.save();

                return done(null, user);
    
        } catch (error) {
            return done(error,null)
        }
    },


))

passport.serializeUser((user,done) => {
    done(null,user.id)
});

passport.deserializeUser((id,done) => {
    User.findById(id)
    .then(user => {
        done(null,user)
    })
    .catch(error => {
        done(error,null)
    });
})


module.exports = passport;