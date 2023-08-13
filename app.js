const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;
require('dotenv').config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(process.env.database_connect, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

// Call the async function to establish the connection
connectToMongoDB();

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


// Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});


app.post('/register', async (req, res) => {
  try {
    const existingUser = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }],
    });

    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });
    await user.save();
    res.redirect('/login');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) {
    return res.status(404).send('User not found');
  }
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      res.send('Login successful');
      console.log("Successful login!");
    } else {
      res.send('Login failed');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});
// Function to generate a random password
function generateRandomPassword() {
    const length = 10; 
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    return password;
}
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password.ejs');
  });
  
  app.post('/forgot-password', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      const newPassword = generateRandomPassword(); 
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      user.password = hashedPassword;
      await user.save();
  
      const resetLink = `http://localhost:${port}/change-password/${user._id}`; // Update the URL with your actual domain
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Password Reset',
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
  
      res.send('Password reset link sent to your email');
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  
  
  app.get('/change-password/:userId', (req, res) => {
    res.render('change-password', { userId: req.params.userId });
  });
  
  app.post('/change-password', async (req, res) => {
    try {
      const userId = req.body.userId;
      const newPassword = req.body.newPassword;
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(userId, { password: hashedPassword });
  
      res.redirect('/login');
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
