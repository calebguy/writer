# Use the official Bun 1.2.0 image
FROM oven/bun:1.2.0

ENV RAILWAY_DEPLOYMENT_ID=${RAILWAY_DEPLOYMENT_ID}

EXPOSE 3000

# Copy all files to the container
COPY . .

# Install dependencies using Bun
RUN bun install

# Set the default command
CMD ["bun", "run", "ponder:start"]
