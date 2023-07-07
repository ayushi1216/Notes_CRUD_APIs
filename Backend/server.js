const express = require('express');
const db = require('./db');
const path = require('path');
const { body, validationResult } = require('express-validator');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const fetchUser = require('./middleware/fetchUser')

const app = express()

const port = 5000

app.use(express.json())

const JWT_SECRET = 'AYUSHI'

//ROUTE 1: Register a user & Authentication EndPoints (No Login required)....



app.post('/register', [

  body('name', 'Enter a valid name').isLength({ min: 3 }),
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'Password be at least 5 characters').isLength({ min: 5 })
],
  async (req, res) => {

    // Check for validation errors

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    console.log(req.body)

    const { name, email, password } = req.body;
    // Checking if users exists or not
    const userExistQuery = "SELECT email FROM users WHERE email=?"
    db.query(userExistQuery,
      [email],
      async (error, result) => {
        if (error) {
          console.log(error);
        }

        if (result.length > 0) {
          return res.json({
            msg: "Email id already Taken",
            msg_type: "error",
          });
        }

        // If exists, hashing user's password
        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        // Inserting user's entry into database
        const insertQuery = "INSERT INTO users SET ?"

        db.query(insertQuery, { name: name, email: email, password: hashedPassword },
          (error, result) => {
            if (error) {
              console.log(error);
            } else {
              // console.log(result);
              return res.json({
                msg: "User Registration Success",
                msg_type: "good",
              });
            }
          }
        );
      }
    );

  });





// ROUTE 2 : Login & Authenticating user. (No Login Required)


app.post('/login', [
  body('email', 'Enter a valid email').isEmail(),
  body('password', "Password cannot be blank").exists()
],
  async (req, res) => {

    // const email = req.body.email;
    // const password = req.body.password; 

    const { email, password } = req.body;  // Destructuring to get email, pwd from req.body

    const getUserQuery = "SELECT * FROM users WHERE email =  ?";


    db.query(getUserQuery, [email], async (error, result) => {

      if (!(result.length > 0)) {
        return res.status(400).json({ msg: "Please login with correct credentials_email." });
      }


      // console.log(result)  >> To get the result of query
      // console.log(result[0].name)   >> As the result is array of objects

      const user = result[0]   // Result is array, getting a first element of array viz a object

      //Return TRUE/FALSE. await, because asynchronus and returns a promise which needs to be resolved

      const passwordCompare = await bcrypt.compare(password, user.password);

      console.log(passwordCompare)  //>> true (if correct password)

      if (!passwordCompare) {
        return res.status(400).json({ error: "Please login with correct credentials_pwd." });
      }

      const data = {
        user: {
          id: user.id
        }
      }

      const authtoken = jwt.sign(data, JWT_SECRET);

      res.json({ msg: authtoken });


    })



  });


// ROUTE 3: Get loggedIN user details using : POST "/getuser" >> Login Required
// need to send JWT token from here, to fetch user details from authToken


app.post('/getuser', fetchUser, async (req, res) => {

  try {
    userId = req.user.id;   //appended with request
    const userIDquery = "SELECT id,name,email FROM users WHERE id = ? ";
    db.query(userIDquery, [userId], async (error, result) => {
      res.send(result);
    })

  }
  catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }

})



// .................NOTES ENDPOINTS...................



// ROUTE 1 : Get All the Notes using: GET "/fetchallnotes" Login Required


app.get('/fetchallnotes', fetchUser, async (req, res) => {

  try {
    userId = req.user.id;
    const sql = "SELECT * FROM notes WHERE userid = ? ";
    db.query(sql, [userId], async (err, result) => {
      res.json({ msg: result })
    })

  }
  catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }

})



// ROUTE 2 : Add a new Note using : POST "/addnote"  >> Login Required

app.post('/addnote', fetchUser,
  [
    body('title', 'Enter a valid title').exists(),
    body('description', 'Description must be atleast 5 characters').exists()
  ]
  , async (req, res) => {

    // If there are errors return Bad request

    try {

      userId = req.user.id;
      const { title, description, tag } = req.body;

      // If error, return Bad requests and errors

      const error = validationResult(req);
      if (!error.isEmpty()) {
        return res.status(400).json({ errors: error.array() });
      }


      const query = "INSERT INTO notes (title, description, tag, userid) VALUES (?,?,?,?) ";

      db.query(query, [title, description, tag, userId], async (error, result) => {

        if (result) {
          res.json({ msg: "Added note sucessfully" });
        }
        console.log(error)

      })


    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server Error ");
    }

  })



// ROUTE 3 : Updating an existing Note using PUT "/updatenote" >> Login required

app.put('/updatenote/:id', fetchUser, async (req, res) => {

  const { title, description, tag } = req.body;

  try {
    // creating a (newnote) object, to get only the data entered by the user, if either it's title or descriptn or tag.
    const newNote = {};

    if (title) {
      newNote.title = title;
    }
    if (description) {
      newNote.description = description;
    }
    if (tag) {
      newNote.tag = tag;
    }

    // Finding note to be updated, and sending id of note in req

    const query = "SELECT * FROM notes WHERE id = ?";
    db.query(query, [req.params.id], async (error, result) => {

      // IF no rows is returned by the query.

      if (result.length === 0) {
        res.status(404).send('Note not found');
      }

      // If note exists, getting that note

      const note = result[0];

      const auth_userid = req.user.id; // Comes from middleware Fetchuser, user's unique token

      // Authenticating user's (userid) with the JWT token, if is note belong to exact user or not.
      if (note.userid != auth_userid) {
        return res.status(401).send(" Not allowed to update")
      }

      // Updating note

      const updateQuery = "UPDATE notes SET title = ?, description = ?, tag = ? WHERE id = ?";

      db.query(updateQuery, [newNote.title, newNote.description, newNote.tag, req.params.id], async (error, result) => {

        res.json({ msg: "Updated user's note" })

      })

    })

  }
  catch (error) {
    console.log(error);
    res.status(500).send('Internal server error');
  }
})


// ROUTE 4: Delete an existing Note using : DELETE "/deletenote". >> Login Required

app.delete('/deletenote/:id', fetchUser, async (req, res) => {
  try {
    // Find note to be delete
    const sql = "SELECT * FROM notes WHERE id = ?";

    db.query(sql, [req.params.id], async (error, result) => {

      if (result.length === 0) {
        res.send(404).send("Note not found")
      }

      note = result[0];

      const auth_userid = req.user.id;

      if (note.userid != auth_userid) {
        res.status(401).send("Not allowed to delete")
      }

      const deleteQuery = "DELETE FROM notes WHERE id = ? ";

      db.query(deleteQuery, [req.params.id], async (error, result) => {

        res.json({ msg: "Note deleted.." });

      })

    })
  }
  catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
})


// Done with all the ENDPOINTS..



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})




