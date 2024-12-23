const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000
const app = express()
const cookieParser = require('cookie-parser')
const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@main.yolij.mongodb.net/?retryWrites=true&w=majority&appName=Main`

const uri = "mongodb+srv://Job-placement:VXeZLCLtg3SeekPh@cluster0.9yghi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


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
    const jobsCollection = db.collection('jobs')
    const bidsCollection = db.collection('bids')
    const tutorsDb = client.db('tutors-db')
    const tutorsCollection = tutorsDb.collection('tutors')
    const bookedCollection = tutorsDb.collection('booked')
    // generate jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body
      // create token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '365d',
      })
      console.log(token)
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

    // save a tutors data in db
    app.post('/add-tutor', async (req, res) => {
      const tutorData = req.body
      const result = await tutorsCollection.insertOne(tutorData)
      console.log(result)
      res.send(result)
    })

    // save a jobData in db
    app.post('/add-job', async (req, res) => {
      const jobData = req.body
      const result = await jobsCollection.insertOne(jobData)
      console.log(result)
      res.send(result)
    })

    // get all jobs data from db
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







    // get all jobs posted by a specific user
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


 // Import ObjectId to work with MongoDB ObjectIds

// app.get('/tutors/:email', verifyToken, async (req, res) => {
//   const email = req.params.email
//   const decodedEmail = req.user?.email

//   if (decodedEmail !== email)
//     return res.status(401).send({ message: 'Unauthorized access' })
//   const id = req.query.id  
//   let query = { email: email }

//   if (id) {
//     query = {
//       ...query,
//       _id: new ObjectId(id),  
//     }
//   }
//   try {
//     const result = await tutorsCollection.find(query).toArray()
//     res.send(result)
//   } catch (err) {
//     console.error(err)
//     res.status(500).send({ message: 'Error retrieving tutors' })
//   }
// })


    // delete a job from db
    app.delete('/tutors/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.deleteOne(query)
      res.send(result)
    })

    // get a single job data by id from db
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.findOne(query)
      res.send(result)
    })


   // get a single job data by id from db
            app.get('/tutors/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await tutorsCollection.findOne(query);
            res.send(result);
        })

    // save a jobData in db
    app.put('/update-tutors/:id', async (req, res) => {
      const id = req.params.id
      const jobData = req.body
      const updated = {
        $set: jobData,
      }
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await tutorsCollection.updateOne(query, updated, options)
      console.log(result)
      res.send(result)
    })



        // save a booked data in db
        app.post('/add-book', async (req, res) => {
          const bookData = req.body
          const result = await bookedCollection.insertOne(bookData)
          console.log(result)
          res.send(result)
        })
    

    // save a bid data in db
    // app.post('/add-book', async (req, res) => {
    //   const bookData = req.body
      // 0. if a user placed a bid already in this job
      // const query = { email: bidData.email, jobId: bidData.jobId }
      // const alreadyExist = await bidsCollection.findOne(query)
      // console.log('If already exist-->', alreadyExist)
      // if (alreadyExist)
      //   return res
      //     .status(400)
      //     .send('You have already placed a bid on this job!')
      // 1. Save data in bids collection
      // const result = await bidsCollection.insertOne(bookData)
      // 2. Increase bid count in jobs collection
      // const filter = { _id: new ObjectId(bookData.tutorId) }
      // const update = {
      //   $inc: { bid_count: 1 },
      // }
      // const updateBidCount = await jobsCollection.updateOne(filter, update)
      // console.log(updateBidCount)
    //   res.send(result)
    // })

    // get all bids for a specific user
    app.get('/bids/:email', verifyToken, async (req, res) => {
      const isBuyer = req.query.buyer
      const email = req.params.email
      const decodedEmail = req.user?.email
      // console.log('email from token-->', decodedEmail)
      // console.log('email from params-->', email)
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })

      let query = {}
      if (isBuyer) {
        query.buyer = email
      } else {
        query.email = email
      }

      const result = await bidsCollection.find(query).toArray()
      res.send(result)
    })

    // update bid status
    app.patch('/bid-status-update/:id', async (req, res) => {
      const id = req.params.id
      const { status } = req.body

      const filter = { _id: new ObjectId(id) }
      const updated = {
        $set: { status },
      }
      const result = await bidsCollection.updateOne(filter, updated)
      res.send(result)
    })

   // product count
   app.get('/tutorsCount', async (req, res) => {
    try {
      const filter = req.query.filter; 
      const search = req.query.search; 
      // Build the query object dynamically
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
  

        // const sort = req.query.sort
      // if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }

    // get all jobs
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
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
