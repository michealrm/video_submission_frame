const express = require('express');
const app = express();
const cors = require('cors');
const exphbs = require('express-handlebars');
const embedRouter = require('./routes/embed');
const downloadRouter = require('./routes/download');
const path = require('path');

// Configure Handlebars
const hbs = exphbs.create({
    extname: '.handlebars',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
});

// Register Handlebars as the template engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
// Add Handlebars math helper
hbs.handlebars.registerHelper('math', function(a, operator, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    
    if (isNaN(a) || isNaN(b)) {
        return 0;
    }
    
    if (operator === '/') {
        return Math.round(a / b);
    }
    return 0;
});

// Default allowed origins if none specified in env
const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://form.jotform.com',
    'https://jotform.com'
];

// Get allowed origins from env or use defaults
const getAllowedOrigins = () => {
    if (process.env.ALLOWED_ORIGINS) {
        return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    }
    return DEFAULT_ALLOWED_ORIGINS;
};

// Add CORS support with configurable origins
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = getAllowedOrigins();
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed: ' + origin));
        }
        return callback(null, true);
    }
}));

// Serve static files
app.use(express.static('public'));

// Set example.html as the root route
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'example.html'));
// });

app.use('/embed', embedRouter);
app.use('/download', downloadRouter);

// ...existing code...

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
