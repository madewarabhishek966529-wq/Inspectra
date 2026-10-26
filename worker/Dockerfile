# Official Playwright image with all browser libraries pre-installed
FROM mcr.microsoft.com/playwright:v1.50.1-noble
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript to dist
RUN npm run build

ENV PORT=5001
ENV NODE_ENV=production

EXPOSE 5001

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["node", "dist/server.js"]
