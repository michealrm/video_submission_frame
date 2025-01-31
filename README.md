# Video Submission Frame

An embeddable video upload module to validate recording duration then upload to object storage. Designed to work with form builders like JotForm as an iframe. Supports MP4, MOV, AVI, 3GPP, and WebM formats.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/michealrm/video_submission_frame.git
cd video_submission_frame
```


2. Run it locally using
```bash
docker compose up
```

## Impl Notes

1. You can fork the repo and deploy to digitalocean using github actions. 

2. Progress bars are supported through server side events (SSE) / XHR emitted to the client on `/embed/upload/progress`. Check the S3Adapter, embed route, and public embed.js for more info.

3. Uploads are done on the client by a s3 signed URL issues by the server's `/signed`. This avoids the server being the middleman for large file transfer. The issue there wasn't memory usage, but network latency. It look really long to upload before.

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

## Configuration

### Allowed Origins

Edit CORS using the env var `ALLOWED_ORIGINS`