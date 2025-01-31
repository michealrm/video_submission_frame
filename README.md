# Video Submission Frame

A lightweight, embeddable video upload module with built-in duration validation. Designed to work seamlessly with form builders like JotForm or as a standalone component.

## Features

- Video duration validation
- Support for mobile video formats
- Progress indication
- iframe embedding support
- Cross-origin support
- Client and server-side validation
- Supports MP4, MOV, AVI, 3GPP, and WebM formats

## Installation

1. Clone the repository:
```bash
git clone https://github.com/micheal/express-form-app.git
cd express-form-app
```

2. Install dependencies:
```bash
npm install
```

3. Create uploads directory:
```bash
mkdir uploads
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Start the server:
```bash
npm start
```

## Usage as Embedded Component

### Basic Implementation

Add the video upload module to your HTML:

```html
<iframe 
    src="https://your-server.com/embed" 
    width="100%" 
    height="250" 
    frameborder="0">
</iframe>
```

### Handling Upload Events

Add an event listener to receive upload status:

```javascript
window.addEventListener('message', function(event) {
    if (event.data.type === 'videoUpload') {
        const data = event.data.data;
        
        if (data.success) {
            console.log('Upload successful:', {
                file: data.file,
                duration: data.duration
            });
        } else {
            console.error('Upload failed:', data.error);
        }
    }
});
```

### Response Format

Successful upload:
```javascript
{
    type: 'videoUpload',
    data: {
        success: true,
        file: 'filename.mp4',
        duration: 120 // seconds
    }
}
```

Error response:
```javascript
{
    type: 'videoUpload',
    data: {
        error: 'Error message here'
    }
}
```

## Configuration

### Allowed Origins

Edit the CORS settings in `src/routes/embed.js`:

```javascript
const ALLOWED_ORIGINS = [
    'https://form.jotform.com',
    'https://your-domain.com'
];
```

### Video Settings

Default settings in `src/routes/embed.js`:
- Max duration: 300 seconds (5 minutes)
- Max file size: 512MB
- Supported formats: MP4, MOV, AVI, 3GPP, WebM

##  Considerations

1. Configure CORS properly for production
2. Regular cleanup of uploads directory