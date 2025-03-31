## Notes on Mapbox Token and Setting Up Your Own WebSocket Server

### 1. Mapbox Token

If the map doesn't load properly, your Mapbox access token might be invalid or expired.

You can fix this by generating a new token:

1. Visit [Mapbox Access Tokens](https://console.mapbox.com/account/access-tokens/)
2. Log in and create a new **public access token**
3. Replace the token in your JavaScript file, for example:

```js
mapboxgl.accessToken = 'YOUR_NEW_PUBLIC_TOKEN';
```

### 2.Setting Up Your Own WebSocket Server
Since we haven’t finalized whether to use Max or SuperCollider as the backend, only the frontend is deployed for now.

If you want to test the WebSocket connection locally, you can expose your local server using localtunnel:

1. Install localtunnel globally (if you haven’t already):

```bash
npm install -g localtunnel
```

2. Start the local server:
```bash
cd server
node server.js
```

3. Use localtunnel to expose your WebSocket port:
```bash
lt --port 8080
```

4. Replace the WebSocket URL in your code with your own tunnel address:
```js
const ws = new WebSocket("wss://your-subdomain.loca.lt");
```
