/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * WhatsApp number for the feedback button: country code + area code + number,
   * digits only. Optional. Set it in the deployment environment, never in source.
   */
  readonly VITE_FEEDBACK_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
