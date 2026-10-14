# ==========================================
# Stage 1: Build Application Bundle
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Accept optional build arguments for cloud backend configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG BASE_PATH=/

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV BASE_PATH=$BASE_PATH

# Copy package descriptors first to optimize Docker layer caching
COPY package*.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy project source files
COPY . .

# Compile TypeScript and bundle with Vite
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Web Server
# ==========================================
FROM nginx:alpine-slim AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration optimized for SPAs
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy bundled production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Health check to ensure web server is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

