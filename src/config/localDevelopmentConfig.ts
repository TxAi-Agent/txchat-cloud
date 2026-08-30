export interface LocalDevelopmentConfig {
  readonly host: "127.0.0.1";
  readonly port: number;
}

const NETWORK_OVERRIDE = /(?:^|_)(?:HOST|BASE_?URL|ENDPOINT)(?:_|$)/i;
const CREDENTIAL_NAME = /(?:^|_)(?:API_?KEY|KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)(?:_|$)/i;

function invalidConfiguration(): never {
  throw new Error("Invalid public-local configuration");
}

export function loadLocalDevelopmentConfig(
  environment: NodeJS.ProcessEnv,
): LocalDevelopmentConfig {
  for (const [name, value] of Object.entries(environment)) {
    if (!name.toUpperCase().startsWith("TXCHAT_")) continue;
    if (CREDENTIAL_NAME.test(name)) invalidConfiguration();
    if (NETWORK_OVERRIDE.test(name) && value !== undefined && value !== "") {
      invalidConfiguration();
    }
  }

  const rawPort = environment.TXCHAT_PUBLIC_LOCAL_PORT;
  if (rawPort === undefined || !/^[0-9]+$/.test(rawPort)) {
    invalidConfiguration();
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    invalidConfiguration();
  }

  return Object.freeze({ host: "127.0.0.1", port });
}
