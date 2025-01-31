# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY ./app/package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY ./app/src .

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]