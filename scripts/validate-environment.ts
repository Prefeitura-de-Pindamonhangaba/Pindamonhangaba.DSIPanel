import { getEnv, parseAuthEnvironment } from "../src/shared/lib/env";
import { parseKeycloakEnvironment } from "../src/modules/auth/services/keycloak-config";
getEnv();
if (parseKeycloakEnvironment(process.env).enabled)
  parseAuthEnvironment(process.env);
