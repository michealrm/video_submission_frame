const express = require('express');
const app = express();
const cors = require('cors');
const exphbs = require('express-handlebars');
const embedRouter = require('./src/routes/embed');
const downloadRouter = require('./src/routes/download');
const path = require('path');

// Configure Handlebars
const hbs = exphbs.create({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src/views/layouts'),
    partialsDir: path.join(__dirname, 'src/views/partials')
});

// Register Handlebars as the template engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/views')); // Fixed path

// Add CORS support
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = ['https://form.jotform.com', 'https://localhost:3000'];
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'));
        }
        return callback(null, true);
    }
}));

// Serve static files
app.use(express.static('public'));

// Set example.html as the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'example.html'));
});

app.use('/embed', embedRouter);
app.use('/download', downloadRouter);

// ...existing code...

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
