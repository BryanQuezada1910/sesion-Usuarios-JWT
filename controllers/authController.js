const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');


// Registro de usuario
exports.register = async (req, res) => {
    const { nombre, apellido, nombreUsuario, password, correo } = req.body;
    console.log('Datos: ', nombre, apellido, nombreUsuario, password, correo);

    try {
        const existingUser = await User.findOne({ $or: [{ nombreUsuario }, { correo }] });
        console.log(existingUser);
        if (existingUser) {
            if (existingUser.nombreUsuario === nombreUsuario) {
                return res.status(400).json({ msg: 'Username already exists' });
            } else if (existingUser.correo === correo) {
                return res.status(400).json({ msg: 'Email already exists' });
            }
        }

        const user = new User({ nombre, apellido, nombreUsuario, password: hashedPassword, correo });
        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Error registering user', error });
    }
};


// Inicio de sesión
exports.login = async (req, res) => {
    const { nombreUsuario, password } = req.body;
    try {
        const user = await User.findOne({ nombreUsuario });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true, secure: true});
        res.status(200).json({
            user: {
              nombre: user.nombre,
              apellido: user.apellido,
              nombreUsuario: user.nombreUsuario
            }
          });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Cierre de sesión
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ msg: 'Logged out' });
};

// Envío de correo para restablecer contraseña
exports.forgotPassword = async (req, res) => {
    const { correo } = req.body;
    try {
        const user = await User.findOne({ correo });
        if (!user) return res.status(400).json({ msg: 'User with that email does not exist' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7m' });
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: correo,
            subject: 'Reestablecer contraseña',
            text: `Por favor ingrese al siguiente enlace para reestablecer su contraseña: ${process.env.CLIENT_URL}/reset-password/${token}`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ msg: 'Email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

// Restablecimiento de contraseña por correo utilizando token
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(400).json({ msg: 'Invalid token' });

        user.password = password;
        await user.save();

        res.json({ msg: 'Password updated' });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(400).json({ msg: 'Invalid or expired token' });
        }
        res.status(500).json({ msg: 'Server error' });
    }
};

// Actualización de contraseña
exports.updatePassword = async (req, res) => {
    const {username, currentPassword, newPassword } = req.body;
    console.log(username, currentPassword, newPassword);

    try {
        const user = await User.findOne({ nombreUsuario: username});
        if (!user) return res.status(400).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });

        user.password = newPassword;
        await user.save();

        res.clearCookie('token');
        res.status(200).json({ msg: 'Password updated' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
