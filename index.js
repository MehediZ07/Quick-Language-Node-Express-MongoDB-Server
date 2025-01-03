const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000
const app = express()
const cookieParser = require('cookie-parser')
const corsOptions = {
  origin: ['http://localhost:5173',
    'https://mz-quick-language.surge.sh',
    'https://quick-language.web.app'
  ],
  credentials: true,
  
}

app.use (cors({origin:["http://localhost:5173","https://quick-language.web.app" ], credentials: true}))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9yghi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
  })

  next()
}

async function run() {
  try {
    const db = client.db('solo-db')

    const tutorsDb = client.db('tutors-db')
    const tutorsCollection = tutorsDb.collection('tutors')
    const bookedCollection = tutorsDb.collection('booked')
    const userCollection = tutorsDb.collection('users');
    // generate jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body
      // create token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '365d',
      })
      // console.log(token)
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // logout || clear cookie from browser
    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })


        // Users related apis
        app.get('/users', async (req, res) => {
          const cursor = userCollection.find();
          const result = await cursor.toArray();
          res.send(result);
      })

      app.post('/users', async (req, res) => {
        const newUser = req.body;
        const existingUser = await userCollection.findOne({ email: newUser.email }); 
        if (existingUser) {
            return res.send({ message: "User already exists", user: existingUser });
        }
        const result = await userCollection.insertOne(newUser);
        res.send(result);
    });
    


    // save a tutors data in db
    app.post('/add-tutor', async (req, res) => {
      const tutorData = req.body
      const result = await tutorsCollection.insertOne(tutorData)
      // console.log(result)
      res.send(result)
    })



    // get all tutors data from db
    app.get('/tutors', async (req, res) => {
      const result = await tutorsCollection.find().toArray()
      res.send(result)
    })


    app.get('/tutor', async (req, res) => {
      const id = req.query.id; 
      const query = { _id: new ObjectId(id) };
      const result = await tutorsCollection.findOne(query);
      res.send(result);
    });







    // get all tutors posted by a specific user
    app.get('/tutors/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const decodedEmail = req.user?.email
      // console.log('email from token-->', decodedEmail)
      // console.log('email from params-->', email)
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })
       const id = req.query.id  
  let query = { email: email }

  if (id) {
    query = {
      ...query,
      _id: new ObjectId(id),  
    }}
      const result = await tutorsCollection.find(query).toArray()
      res.send(result)
    })



    // delete a tutors from db
    app.delete('/tutors/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.deleteOne(query)
      res.send(result)
    })




   // get a single tutors data by id from db
            app.get('/tutors/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await tutorsCollection.findOne(query);
            res.send(result);
        })

    // save a tutorsData in db
    app.put('/update-tutors/:id', async (req, res) => {
      const id = req.params.id
      const jobData = req.body
      const updated = {
        $set: jobData,
      }
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await tutorsCollection.updateOne(query, updated, options)
      // console.log(result)
      res.send(result)
    })



        // save a booked data in db
        app.post('/add-book', async (req, res) => {
          const bookData = req.body
          const query = { email: bookData.email, tutorId: bookData.tutorId }
         
        
          const alreadyExist = await bookedCollection.findOne(query)
        
          if (alreadyExist)
            return res
              .status(400)
              .send('You have already Booked this tutorial');
          const result = await bookedCollection.insertOne(bookData)
         
          res.send(result)
        })
    
    // get all booked for a specific user
    app.get('/booked/:email', verifyToken, async (req, res) => {
      const isUser = req.query.email
      const email = req.params.email
      const decodedEmail = req.user?.email
      // console.log('email from token-->', decodedEmail)
      // console.log('email from params-->', email)
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })

      let query = {}
      if (isUser) {
        query.email = email
      } else {
        query.email = email
      }
      const result = await bookedCollection.find(query).toArray()
      res.send(result)
    })


    // get all booked for a specific user
    app.get('/bookRequest/:email', verifyToken, async (req, res) => {
      const isUser = req.query.email
      const email = req.params.email
      const decodedEmail = req.user?.email
      // console.log('email from token-->', decodedEmail)
      // console.log('email from params-->', email)
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })

      let query = {}
      if (isUser) {
        query.tutorEmail = email
      } else {
        query.tutorEmail = email
      }
      const result = await bookedCollection.find(query).toArray()
      res.send(result)
    })



     // 2. Increase bid count in jobs collection
    app.patch('/review-turorial/:id', async (req, res) => {
      const id = req.params.id
      const data = req.body
      const jobData = req.body
      const updated = {
        $set: jobData,
      }
      const filter = { _id: new ObjectId(data.tutorId) }
      const update = {
        $inc: { review: 1 },
        $set: jobData,
      }
      const updateBidCount = await tutorsCollection.updateOne(filter, update)
      // console.log(updateBidCount)
      res.send(result)
 
    })




    app.put('/add-review', async (req, res) => {
      const { name, image, email, rating, comment, tutorId } = req.body;
      const review = {
        name,
        image,
        email,
        rating,
        comment,
        date: new Date(),
      };
    
      try {
        const filter = { _id: new ObjectId(tutorId) };
    
        const existingTutor = await tutorsCollection.findOne(filter);
    
        if (existingTutor) {
          const update = {
            $push: { allReviews: review },
            $inc: { review: 1 },
          };
    
          const result = await tutorsCollection.updateOne(filter, update);
          res.send({ success: true, message: 'Review added', result });
        } else {
          res.status(404).send({ success: false, message: 'Tutor not found' });
        }
      } catch (error) {
        res.status(500).send({ success: false, error: 'Failed to add review', details: error.message });
      }
    });
    
  


   // product count
   app.get('/tutorsCount', async (req, res) => {
    try {
      const filter = req.query.filter; 
      const search = req.query.search; 
      
      let query = {};
      if (filter) query.category = filter; 
      if (search) query.title = { $regex: search, $options: 'i' }; 
      // Count the documents matching the query
      const count = await tutorsCollection.countDocuments(query);
      res.send({ count });
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch jobs count' });
    }
  });
  

  

    // get all tutors
    app.get('/all-tutors', async (req, res) => {
      const filter = req.query.filter || null;
      const search = req.query.search || "";
      const page = Math.max(0, parseInt(req.query.page) || 0); // Ensure non-negative
      const size = Math.max(1, parseInt(req.query.size) || 10); // Minimum 1 item per page
      const sort = req.query.sort;
    
      let query = {};
    

      if (search) {
        query.language = { $regex: search, $options: "i" };
      }
    
      // Exact filter match
      if (filter) {
        query.language = filter;
      }
    
      try {
        // Determine sorting logic
        const sortOptions = sort ? { price: sort === "asc" ? 1 : -1 } : {};
    
        // Fetch paginated and sorted results
        const result = await tutorsCollection
          .find(query)
          .sort(sortOptions) // Apply sorting
          .skip(page * size) // Pagination: skip items
          .limit(size) // Pagination: limit items
          .toArray();
    
        // Count total matching items
        const totalCount = await tutorsCollection.countDocuments(query);
    
        res.send({ result, totalCount });
      } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    
    
    

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!'
    // )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port)
