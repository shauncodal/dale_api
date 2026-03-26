import { config } from './lib/config';
import app from './app';

app.listen(config.port, () => {
  console.log(`dale_api listening on port ${config.port}`);
});
