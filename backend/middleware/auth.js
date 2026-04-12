// this is used to protect routes that require authentication. It checks for a valid JWT token in the Authorization header and verifies it. If the token is valid, it allows the request to proceed; otherwise, it returns an error response.

import jwt from 'jsonwebtoken';
import User from '../models/User.js';


//user authentication middleware
//its async because we need to fetch user details from DB after decoding the token
// jab user event ya booking related route pe request karega, toh uske header me authorization token hoga, is middleware me hum us token ko verify karenge aur user details fetch karenge DB se, 
// agar token valid hai toh request aage badhegi, warna error response milega
export const protect = async (req, res, next) => 
{
    //headers are used to send the token from client to server. The token is usually sent in the Authorization header in the format "Bearer <token>"
    let token= req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null;
    
    if(token)
    {
        try
        {
            //yeh req.user meh user kya hai - id, name, email, role, isVerified - yeh sab attach karenge taaki aage ke middleware ya route handlers me use kar sake
            // user kaha se aaya - token decode karne ke baad usme user id hoti hai, us id se hum DB se user details fetch karenge aur req.user me attach kar denge. Isse aage ke middleware ya route handlers me req.user se user details access kar sakte hain.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password'); //fetch user details from DB and attach to req object, excluding password
            if(!req.user){
                return res.status(401).json({message: 'Not authorized. User not found'});
            }
            next(); //allow request to proceed to the next middleware or route handler
        }

    
        catch(error)
        {
          return res.status(401).json({message: 'Not authorized. Invalid token.Token verification failed'});
        }
  }

    else
    {
        return res.status(401).json({message: 'Not authorized. No token provided'});
    }

}

// yeh middleware un routes ke liye use hoga jahan sirf admin users ko access dena hai. Isme hum pehle 
// protect middleware ko call karenge to ensure user is authenticated, phir check karenge ki user ka role admin hai ya nahi. Agar admin hai toh request aage badhegi, warna error response milega.
export const admin = (req, res, next) => 
{
    //req.user phele se protect middleware me set ho chuka hoga, jisme user details hoti hai including role. Yahan hum check karenge ki req.user.role admin hai ya nahi.
    if(req.user && req.user.role === 'admin')
    {
        next(); //allow request to proceed
    }   
    else
    {
        return res.status(403).json({message: 'Forbidden. Admins only'});
    }
}
//yaha 403 status code isliye use kiya hai kyunki user authenticated toh hai (token valid hai) but uska role admin nahi hai, isliye access forbidden hai.
// 403 means "Forbidden" - user is authenticated but does not have permission to access the resource. 401 means "Unauthorized" - user is not authenticated or token is invalid.

