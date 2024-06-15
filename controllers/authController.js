const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

exports.login = async (req, res) => {
  const { nombreUsuario, password } = req.body;
  try {
    const user = await User.findOne({ nombreUsuario });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { nombre: user.nombre, apellido: user.apellido, nombreUsuario: user.nombreUsuario } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { correo } = req.body;
  try {
    const user = await User.findOne({ correo });
    if (!user) return res.status(400).json({ msg: 'User with that email does not exist' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7m' });
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: correo,
      subject: 'Password Reset',
      text: `Please click on the following link to reset your password: ${process.env.CLIENT_URL}/reset-password/${token}`
    };

    await transporter.sendMail(mailOptions);
    res.json({ msg: 'Email sent' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ msg: 'Invalid token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ msg: 'Password updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updatePassword = async (req, res) => {
  const { id, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
