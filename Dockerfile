FROM node:20

# Create app directory
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy package.json and pnpm-lock.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install packages
RUN pnpm install

# Copy the app code
COPY . .

# Build the project
RUN pnpm run build

# Expose ports
EXPOSE 3001

# Run the application
CMD [ "pnpm", "start" ]
