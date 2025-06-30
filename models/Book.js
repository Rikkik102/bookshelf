const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({
  googleId: String,
  title: String,
  authors: [String],
  thumbnail: String,
  status: { type: String, enum: ['Unread', 'In Progress', 'Read'], default: 'Unread' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
module.exports = mongoose.model('Book', bookSchema);
