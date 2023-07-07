// Middleware is a function which will be called, whenever there will be any request on routes where login required
// Will be a passed as a second argument on routes where it is required. 
// Middleware takes req, res, next, at the end next is called.
// Need to get the id of user


var jwt = require('jsonwebtoken');
const JWT_SECRET = 'AYUSHI';

const fetchUser = (req, res, next) => {
    // Get the user from the jwt token and add id to req object

    const token = req.header('auth-token'); //need to append in header >> 'auth-token' >> which is coming from /login route when user login succesfully there is a token get generated .


    if(!token){
        // 401 >> STATUS(access denied)
        res.status(401).send({error : "Pls authenticate using a valid token"})
    }

    // To get the user 
    
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data.user;


    next()
}


module.exports = fetchUser;


