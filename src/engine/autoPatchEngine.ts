import fs from 'fs-extra';

export interface SOTConfig {
  endpoint: string;
  theme: {
    fontFamily: string;
    darkBackgroundColor: string;
    darkContainerBackgroundColor: string;
  };
  features: Record<string, boolean>;
  version: string;
}

export class AutoPatchEngine {
  private static sanitizeHexColor(color: string | undefined, fallback: string): string {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!color || !hexRegex.test(color.trim())) {
      return fallback;
    }
    return color.trim();
  }

  private static sanitizeEndpoint(endpoint: string | undefined): string {
    if (!endpoint) return 'https://api.system.local';
    return endpoint.replace(/\/+$/, '');
  }

  public static processSOTConfig(jsonPath: string): SOTConfig {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(rawData);

    return {
      endpoint: this.sanitizeEndpoint(parsed.endpoint),
      theme: {
        fontFamily: 'CapCut Sans Text, sans-serif',
        darkBackgroundColor: this.sanitizeHexColor(parsed.theme?.darkBackgroundColor, '#17171a'),
        darkContainerBackgroundColor: this.sanitizeHexColor(parsed.theme?.darkContainerBackgroundColor, '#232324'),
      },
      features: parsed.features || {},
      version: parsed.version || '2.4.0',
    };
  }
}
