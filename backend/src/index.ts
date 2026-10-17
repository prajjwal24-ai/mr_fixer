import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.PORT, config.HOST, () => {
  console.log(`[Mr. Fixer Backend] Server running at http://${config.HOST}:${config.PORT}`);
  console.log(`[Mr. Fixer Backend] Environment: ${config.NODE_ENV}`);
});
