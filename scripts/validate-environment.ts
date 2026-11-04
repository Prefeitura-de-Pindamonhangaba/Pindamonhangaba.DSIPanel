import { getEnv, parseAuthEnvironment } from "../src/shared/lib/env";
import { parseKeycloakEnvironment } from "../src/modules/auth/services/keycloak-config";
const env = getEnv();
if (parseKeycloakEnvironment(process.env).enabled)
  parseAuthEnvironment(process.env);
console.log(`Endereço público configurado: ${env.APP_URL}`);
console.log(
  `Publicação Docker: ${env.APP_BIND_ADDRESS}:${env.APP_PORT} → container HTTP:3000`,
);
