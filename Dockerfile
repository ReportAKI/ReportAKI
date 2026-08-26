FROM alpine:latest

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget

# Download PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.8/pocketbase_0.22.8_linux_amd64.zip \
    && unzip pocketbase_0.22.8_linux_amd64.zip \
    && rm pocketbase_0.22.8_linux_amd64.zip

EXPOSE 8080

# Start PocketBase
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8080"]