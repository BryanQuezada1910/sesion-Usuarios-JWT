const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const path = require('path');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middlewares/authMiddleware');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

//app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect((process.env.MONGO_URL_LOCAL), {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.log('Error connecting to MongoDB', error);
});

app.use('/api/auth', authRoutes);

// Ruta para manejar el inicio de sesión
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Ruta para manejar el dashboard
app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views/dashboard.html'));
});

// Ruta para manejar el olvido de contraseña
app.get('/forgot-password', (req, res) => {
    // Aquí deberías renderizar la vista HTML para permitir al usuario ingresar su correo electrónico
    res.sendFile(path.join(__dirname, 'public/forgotPassword.html'));
});

// Ruta para manejar la actualización de contraseña
app.get('/update-password', authMiddleware, (req, res) => {
    // Aquí deberías renderizar la vista HTML para permitir al usuario actualizar su contraseña
    res.sendFile(path.join(__dirname, 'public/updatePassword.html'));
});

// Ruta para manejar el reset de contraseña
app.get('/reset-password/:token', (req, res) => {
    const token = req.params.token;
    // Aquí deberías renderizar la vista HTML para permitir al usuario restablecer la contraseña
    if (!token) {
        return res.status(401).redirect('/');
    } else {
        return res.status(200).sendFile(path.join(__dirname, 'public/resetPassword.html'));
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});