# Use the official Bun 1.2.0 image
FROM oven/bun:1.2.0

# Copy all files to the container
COPY . .

# Install dependencies using Bun
RUN bun install

# Set the default command
CMD ["bun", "run", "ponder:prod:start"]
