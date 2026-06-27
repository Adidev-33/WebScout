FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time argument to specify the backend API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Default Next.js port
EXPOSE 3001
ENV PORT=3001

# Start Next.js server (Next.js automatically binds to PORT env)
CMD ["npm", "run", "start"]
