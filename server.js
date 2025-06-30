const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Models
const User = require('./models/User');
const Book = require('./models/Book');
const Contact = require('./models/Contact');

// Authentication middleware
function ensureLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.session.user && req.session.user.email === 'rikkik102@gmail.com') {
    return next();
  }
  res.status(403).send('Forbidden');
}

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For handling JSON in API requests
app.use(session({
  secret: 'bookshelfSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Use true if using HTTPS
}));
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.set('view engine', 'ejs');


// Routes

// Protected Home/Index Route
app.get('/', ensureLoggedIn, async (req, res) => {
  try {
    const books = await Book.find({ userId: req.session.user._id });
    res.render('index', { books, user: req.session.user });
  } catch (err) {
    console.error('Error loading index:', err);
    res.status(500).send('Error loading bookshelf');
  }
});

app.get('/index', ensureLoggedIn, async (req, res) => {
  try {
    const books = await Book.find({ userId: req.session.user._id });
    res.render('index', { books, user: req.session.user });
  } catch (err) {
    console.error('Error loading index:', err);
    res.status(500).send('Error loading bookshelf');
  }
});

// book status routes
app.get('/read', ensureLoggedIn, async (req, res) => {
  const books = await Book.find({ userId: req.session.user._id, status: 'Read' });
  res.render('status', { books, status: 'Read', user: req.session.user });
});
 
app.get('/unread', ensureLoggedIn, async (req, res) => {
  const books = await Book.find({ userId: req.session.user._id, status: 'Unread' });
  res.render('status', { books, status: 'Unread', user: req.session.user });
});
 
app.get('/in-progress', ensureLoggedIn, async (req, res) => {
  const books = await Book.find({ userId: req.session.user._id, status: 'In Progress' });
  res.render('status', { books, status: 'In Progress', user: req.session.user });
});
 
// Login & Register
app.get('/login', (req, res) => {
  res.render('login', { user: req.session.user });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
 
  if (!user) {
    return res.render('login', {
      user: req.session.user,
      error: 'Invalid email or password!'
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render('login', {
      user: req.session.user,
      error: 'Invalid email or password!'
    });
  }

  req.session.user = user;
  res.redirect('/index');
});

app.get('/register', (req, res) => {
  res.render('register', { user: req.session.user });
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', {
        user: req.session.user,
        error: 'User already exists!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    req.session.user = newUser;
    res.redirect('/index');
  } catch (err) {
    console.error('Error during registration:', err);
    res.render('register', {
      user: req.session.user,
      error: 'Registration failed. Please try again.'
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(400).send('Unable to log out');
    res.redirect('/login');
  });
});

// Google Books API Search (Protected)
app.get('/search', ensureLoggedIn, async (req, res) => {
  const query = req.query.q;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`);
    const books = response.data.items || [];
    res.render('search-results', { books, user: req.session.user });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.send('Error fetching books.');
  }
});

// Save Book
app.post('/books/add', ensureLoggedIn, async (req, res) => {
  const { googleId, title, authors, thumbnail } = req.body;

  try {
    // Parse authors if it's a string (from form)
    const authorArray = typeof authors === 'string'
      ? authors.split(',').map(a => a.trim())
      : (Array.isArray(authors) ? authors : ['Unknown']);

    const book = new Book({
      googleId,
      title,
      authors: authorArray,
      thumbnail,
      userId: req.session.user._id,
    });

    await book.save();
    res.redirect('/index');
  } catch (err) {
    console.error('Error saving book:', err);
    res.status(500).send('Error saving book');
  }
});

// Delete Book - POST method
app.post('/books/delete/:id', ensureLoggedIn, async (req, res) => {
  const { id } = req.params;
 
  try {
    // Only allow deletion of books owned by this user
    const result = await Book.deleteOne({
      _id: id,
      userId: req.session.user._id
    });
   
    if (result.deletedCount === 0) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.redirect('/index?error=Book+not+found');
    }
   
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ success: true, message: 'Book deleted successfully' });
    }
    return res.redirect('/index?success=Book+deleted+successfully');
  } catch (err) {
    console.error('Error deleting book:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ error: 'Could not delete book' });
    }
    return res.redirect('/index?error=Could+not+delete+book');
  }
});

app.delete('/books/delete/:id', ensureLoggedIn, async (req, res) => {
  const { id } = req.params;
 
  try {
    // Only allow deletion of books owned by this user
    const result = await Book.deleteOne({
      _id: id,
      userId: req.session.user._id
    });
   
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
   
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Could not delete book' });
  }
});

//Update book status
app.post('/update-status/:id', ensureLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Only allow updates to books owned by this user
    const updatedBook = await Book.findOneAndUpdate(
      { _id: id, userId: req.session.user._id },
      { $set: { status } },
      { new: true }
    );
   
    if (!updatedBook) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.redirect('back?error=Book+not+found');
    }
   
    // Handle AJAX requests
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({
        success: true,
        book: updatedBook,
        message: 'Book status updated successfully'
      });
    }
   
    // For regular form submissions
    const referrer = req.get('Referrer') || '/';
    const referrerPath = new URL(referrer).pathname;
   
    // If we're on a status page and the status has changed, redirect to index
    if (
      (referrerPath === '/read' && status !== 'Read') ||
      (referrerPath === '/unread' && status !== 'Unread') ||
      (referrerPath === '/in-progress' && status !== 'In Progress')
    ) {
      return res.redirect('/index?success=Book+status+updated');
    }
   
    // Otherwise, redirect back
    res.redirect('back?success=Book+status+updated');
  } catch (err) {
    console.error('Error updating book status:', err);
   
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ error: 'Could not update book status' });
    }
   
    res.status(500).send('Could not update book status');
  }
});

//contact form
app.get('/contact', (req, res) => {
  res.render('contact', { user: req.session.user });
});
 
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
 
  // Validate inputs
  if (!name || !email || !message) {
    // If it's an AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    // For regular form submissions
    return res.render('contact', {
      user: req.session.user,
      error: 'All fields are required.'
    });
  }

  try {
    // Create new contact message
    await Contact.create({ name, email, message });
   
    // If it's an AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ success: true, message: 'Thanks for your message!' });
    }
   
    // For regular form submissions
    res.render('contact', {
      user: req.session.user,
      success: 'Thanks for your message!'
    });
  } catch (err) {
    console.error(err);
   
    // If it's an AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ error: 'Server error. Please try again later.' });
    }
   
    // For regular form submissions
    res.render('contact', {
      user: req.session.user,
      error: 'Server error. Please try again later.'
    });
  }
});

// viewing messages (admin only)
app.get('/admin/messages', ensureAdmin, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ date: -1 });
    res.render('messages', { user: req.session.user, messages });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading messages');
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => console.log(err));
